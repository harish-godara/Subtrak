/**
 * Playwright Script Runner — FULLY STATELESS
 *
 * Zero files are permanently stored on the server.
 * Script content comes from the DB or frontend inline.
 * Browser session state comes from the DB (subscriptions.browserSession).
 * Temp files are created in os.tmpdir() during execution and deleted immediately after.
 *
 * SSS stdout protocol:
 *   TOKEN:{value}          — captured auth token
 *   OUTPUT:{json}          — final data result
 *   INPUT_NEEDED:{prompt}  — pause, ask user for input
 *   STATUS:{msg}           — progress message
 *   ERROR:{msg}            — non-fatal error
 *   SESSION_SAVED           — script wrote updated session to ephemeral file
 *
 * stdin protocol (backend → script):
 *   INPUT:{value}\n        — response to INPUT_NEEDED
 *
 * Env vars injected into scripts:
 *   SUBTRACK_EMAIL, SUBTRACK_PASSWORD  — credentials
 *   SUBTRACK_SESSION_FILE              — path to ephemeral session JSON (read/write)
 *   SUBTRACK_SCRIPT_MODE               — 'token' | 'data'
 *   SUBTRACK_SUB_ID                    — subscription ID
 */

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { WebSocket } from 'ws';
import { db } from '../db/index.js';
import { scriptTemplates } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { browserManager } from '../services/browserManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, '../../scripts');

// Ensure scripts directory exists (for reference scripts only)
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

// Track running processes
const _running = new Map<string, ChildProcess>();

// Store pending execution context (keyed by executionId)
// Includes: credentials, scriptContent, sessionState, scriptMode
interface PendingExec {
  credentials: Record<string, string>;
  scriptContent: string;
  sessionState?: unknown;
  scriptMode?: string;
  showBrowser?: boolean;
}
const _pendingExecs = new Map<string, PendingExec>();

/**
 * Global set of active temporary file paths.
 * These are files currently being used by running scripts.
 */
const activeTempFiles = new Set<string>();

export const scriptsRouter = Router();

// ── Schemas ────────────────────────────────────────────

const runWithContentSchema = z.object({
  scriptContent: z.string().min(1),
  credentials: z.record(z.string()).optional(),
  subscription_id: z.string().optional(),
  sessionState: z.unknown().optional(),
  scriptMode: z.enum(['token', 'data']).optional(),
  showBrowser: z.boolean().optional(),
});

// Legacy schema — still accepted for backward compat
const saveScriptSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  filename: z.string().optional(),
});

// ── Build sanitized env for script subprocess ─────────────────────

function buildSafeEnv(credEnv: Record<string, string>): Record<string, string> {
  const p = globalThis.process.env;
  return {
    PATH:                     p.PATH                     ?? '',
    HOME:                     p.HOME                     ?? '',
    APPDATA:                  p.APPDATA                  ?? '',
    LOCALAPPDATA:             p.LOCALAPPDATA             ?? '',
    TEMP:                     p.TEMP                     ?? '',
    TMP:                      p.TMP                      ?? '',
    SystemRoot:               p.SystemRoot               ?? '',
    SystemDrive:              p.SystemDrive              ?? '',
    USERPROFILE:              p.USERPROFILE              ?? '',
    COMPUTERNAME:             p.COMPUTERNAME             ?? '',
    PLAYWRIGHT_BROWSERS_PATH: p.PLAYWRIGHT_BROWSERS_PATH ?? '',
    NODE_PATH:                p.NODE_PATH                ?? '',
    ...credEnv,
  };
}

// ── Helper: create ephemeral files in local dir ─────────────────
// We must create them inside SCRIPTS_DIR instead of os.tmpdir() because Node.js 
// ES Modules resolve dependencies (like 'playwright') relative to the script file's path.

/**
 * Proxy adapter injected into every ephemeral script.
 * When SUBTRACK_BROWSER_WS is set (scheduler mode), it transparently
 * replaces chromium.launch() with chromium.connect().
 * browser.close() on a connected handle only disconnects — does NOT kill the server.
 */
const BROWSER_ADAPTER = [
  `import { chromium as __pw } from 'playwright';`,
  `const chromium = new Proxy(__pw, {`,
  `  get(target, prop) {`,
  `    if (prop === 'launch') {`,
  `      return async (opts) => {`,
  `        if (process.env.SUBTRACK_FORCE_VISIBLE === 'true') {`,
  `          return target.launch({ ...opts, headless: false });`,
  `        }`,
  `        return process.env.SUBTRACK_BROWSER_WS`,
  `          ? target.connect(process.env.SUBTRACK_BROWSER_WS)`,
  `          : target.launch(opts);`,
  `      }`,
  `    }`,
  `    return target[prop];`,
  `  }`,
  `});`,
].join('\n');

const PW_IMPORT_RE = /import\s*\{\s*chromium\s*\}\s*from\s*['"]playwright['"];?/;

function createEphemeralScript(content: string): string {
  const id = uuidv4().substring(0, 8);
  const tmpFile = path.join(SCRIPTS_DIR, `_tmp_exec_${id}.js`);

  // Auto-inject shared browser adapter (transparent to scripts)
  let patched = content;
  if (PW_IMPORT_RE.test(patched)) {
    patched = patched.replace(PW_IMPORT_RE, BROWSER_ADAPTER);
  }

  fs.writeFileSync(tmpFile, patched, 'utf-8');
  activeTempFiles.add(tmpFile);
  return tmpFile;
}

function createEphemeralSession(sessionState: unknown): string {
  const id = uuidv4().substring(0, 8);
  const tmpFile = path.join(SCRIPTS_DIR, `_tmp_session_${id}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(sessionState), 'utf-8');
  activeTempFiles.add(tmpFile);
  return tmpFile;
}

function readAndDeleteEphemeralSession(sessionFile: string): unknown | null {
  try {
    activeTempFiles.delete(sessionFile);
    if (fs.existsSync(sessionFile)) {
      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      fs.unlinkSync(sessionFile);
      return data;
    }
  } catch { /* ignore */ }
  return null;
}

function cleanupFile(filepath: string): void {
  try { 
    activeTempFiles.delete(filepath);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath); 
  } catch { /* ignore */ }
}

/**
 * Sweeps the scripts directory and deletes any file starting with _tmp_
 * that is NOT currently marked as active in memory.
 */
export function cleanupLeftoverTempFiles(): void {
  try {
    const files = fs.readdirSync(SCRIPTS_DIR);
    let count = 0;
    for (const file of files) {
      if (file.startsWith('_tmp_')) {
        const fullPath = path.join(SCRIPTS_DIR, file);
        if (!activeTempFiles.has(fullPath)) {
          fs.unlinkSync(fullPath);
          count++;
        }
      }
    }
    if (count > 0) {
      console.log(`[CLEANUP] Deleted ${count} orphaned temporary files from scripts/ directory.`);
    }
  } catch (e) {
    console.error('[CLEANUP ERROR]', e);
  }
}

// Automatically run cleanup every 60 seconds to catch any aborted scripts
setInterval(cleanupLeftoverTempFiles, 60000);

// ── CRUD (DB-backed, no permanent disk writes) ───────────────────

// POST /api/scripts — legacy: write temp file for immediate execution only
scriptsRouter.post('/scripts', async (req, res) => {
  try {
    const body = saveScriptSchema.parse(req.body);
    // Write to temp dir instead of scripts dir
    const tmpFile = createEphemeralScript(body.content);
    res.json({ success: true, filename: path.basename(tmpFile), path: tmpFile });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[SCRIPTS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/scripts — return reference scripts from disk (read-only, no user data)
scriptsRouter.get('/scripts', async (_req, res) => {
  try {
    const files = fs.readdirSync(SCRIPTS_DIR).filter(f =>
      f.endsWith('.js') && !f.startsWith('_') && f !== 'test.js'
    );
    const scripts = files.map(f => {
      const filepath = path.join(SCRIPTS_DIR, f);
      const stat = fs.statSync(filepath);
      return { filename: f, id: path.parse(f).name, size: stat.size };
    });
    res.json({ scripts });
  } catch (e) {
    console.error('[SCRIPTS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/scripts/:scriptId — no-op (scripts live in DB now)
scriptsRouter.delete('/scripts/:scriptId', async (req, res) => {
  res.json({ success: true });
});

// POST /api/run-script-with-creds — NEW: accepts scriptContent inline
scriptsRouter.post('/run-script-with-creds', async (req, res) => {
  try {
    const body = runWithContentSchema.parse(req.body);

    const credMap: Record<string, string> = {};
    if (body.credentials) {
      for (const [key, val] of Object.entries(body.credentials)) {
        if (val) credMap[key] = val;
      }
    }
    if (body.subscription_id) {
      credMap['SUB_ID'] = body.subscription_id;
    }

    const executionId = uuidv4().substring(0, 8);

    _pendingExecs.set(executionId, {
      credentials: credMap,
      scriptContent: body.scriptContent,
      sessionState: body.sessionState,
      scriptMode: body.scriptMode,
      showBrowser: body.showBrowser,
    });

    // Auto-cleanup after 60s if WS never connects
    setTimeout(() => _pendingExecs.delete(executionId), 60000);

    // Return a dummy script_id since we no longer use file-based IDs
    res.json({ success: true, execution_id: executionId, script_id: '_inline' });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[SCRIPTS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── WebSocket Handler — fully ephemeral ──────────────────────────

export function handleScriptWebSocket(ws: WebSocket, scriptId: string, executionId: string): void {
  // Pull pending execution context
  const pending = _pendingExecs.get(executionId);
  _pendingExecs.delete(executionId);

  if (!pending) {
    // Fallback: try legacy file-based lookup (for reference script testing)
    const filepath = path.join(SCRIPTS_DIR, `${scriptId}.js`);
    if (!fs.existsSync(filepath)) {
      ws.send(JSON.stringify({ type: 'error', message: 'No pending execution found and script file not found' }));
      ws.close();
      return;
    }
    // Read file content for legacy mode
    const content = fs.readFileSync(filepath, 'utf-8');
    _pendingExecs.set(executionId, {
      credentials: {},
      scriptContent: content,
    });
    return handleScriptWebSocket(ws, scriptId, executionId);
  }

  const { credentials, scriptContent, sessionState, scriptMode } = pending;

  // Build SUBTRACK_* env vars
  const credEnv: Record<string, string> = {};
  for (const [key, val] of Object.entries(credentials)) {
    credEnv[`SUBTRACK_${key.toUpperCase()}`] = val;
  }

  // Create ephemeral files
  const scriptFile = createEphemeralScript(scriptContent);
  let sessionFile: string | null = null;
  if (sessionState) {
    sessionFile = createEphemeralSession(sessionState);
    credEnv['SUBTRACK_SESSION_FILE'] = sessionFile;
  } else {
    // Create empty session file so script can write to it
    sessionFile = createEphemeralSession({});
    credEnv['SUBTRACK_SESSION_FILE'] = sessionFile;
  }

  if (scriptMode) {
    credEnv['SUBTRACK_SCRIPT_MODE'] = scriptMode;
  }

  let child: ChildProcess | null = null;

  // Launch async wrapper to use await
  (async () => {
    try {
      const isVisible = pending.showBrowser === true;
      credEnv['SUBTRACK_FORCE_VISIBLE'] = isVisible ? 'true' : 'false';

      if (!isVisible) {
        const wsEndpoint = await browserManager.getWsEndpoint();
        credEnv['SUBTRACK_BROWSER_WS'] = wsEndpoint;
      }

      child = spawn('node', [scriptFile], {
        cwd: SCRIPTS_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: buildSafeEnv(credEnv),
      });

    _running.set(executionId, child);

    ws.send(JSON.stringify({
      type: 'status',
      message: `Running script (PID ${child.pid})`,
    }));

    let outputResult: unknown = null;
    let capturedToken: string | null = null;

    // Parse stdout using SSS protocol
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8').split('\n');
      for (const rawLine of lines) {
        const text = rawLine.replace(/\r$/, '');
        if (!text) continue;

        if (text.startsWith('TOKEN:')) {
          capturedToken = text.substring(6).trim();
          try { ws.send(JSON.stringify({ type: 'output', stream: 'stdout', text: '🔑 Token captured', needs_input: false })); } catch {}
          continue;
        }

        if (text.startsWith('OUTPUT:')) {
          try { outputResult = JSON.parse(text.substring(7)); }
          catch { outputResult = text.substring(7); }
          try { ws.send(JSON.stringify({ type: 'output', stream: 'stdout', text: '✓ Data captured', needs_input: false })); } catch {}
          continue;
        }

        if (text.startsWith('STATUS:')) {
          try { ws.send(JSON.stringify({ type: 'status', message: text.substring(7) })); } catch {}
          continue;
        }

        if (text.startsWith('ERROR:')) {
          try { ws.send(JSON.stringify({ type: 'output', stream: 'stderr', text: text.substring(6), needs_input: false })); } catch {}
          continue;
        }

        if (text.startsWith('INPUT_NEEDED:')) {
          const prompt = text.substring(13);
          try { ws.send(JSON.stringify({ type: 'output', stream: 'stdout', text: `⏸ ${prompt}`, needs_input: true })); } catch {}
          continue;
        }

        try { ws.send(JSON.stringify({ type: 'output', stream: 'stdout', text, needs_input: false })); } catch {}
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8').split('\n');
      for (const rawLine of lines) {
        const text = rawLine.replace(/\r$/, '');
        if (!text) continue;
        try { ws.send(JSON.stringify({ type: 'output', stream: 'stderr', text, needs_input: false })); } catch {}
      }
    });

    // Process exit — read session back + cleanup
    child.on('close', (code) => {
      _running.delete(executionId);

      // Read updated session state from ephemeral file
      const updatedSession = sessionFile ? readAndDeleteEphemeralSession(sessionFile) : null;

      // Cleanup script temp file
      cleanupFile(scriptFile);
      if (pending.showBrowser !== true) {
        browserManager.release();
      }

      try {
        if (code === 0 || outputResult !== null) {
          ws.send(JSON.stringify({
            type: 'complete',
            return_code: code,
            result: outputResult,
            token: capturedToken,
            sessionState: updatedSession,  // frontend/caller can save to DB
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Script exited with code ${code}`,
            return_code: code,
            result: outputResult,
            sessionState: updatedSession,
          }));
        }
        ws.close();
      } catch { /* ws closed */ }
    });

    // 120s timeout
    const timeoutId = setTimeout(() => {
      if (child && child.exitCode === null) {
        child.kill();
        try { ws.send(JSON.stringify({ type: 'error', message: 'Script timed out after 120 seconds' })); } catch {}
      }
    }, 120000);

    // Incoming messages from WebSocket client
    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        if (msg.type === 'input' && child?.stdin) {
          child.stdin.write(`INPUT:${msg.text}\n`);
        } else if (msg.type === 'kill') {
          child?.kill();
        }
      } catch { /* ignore parse errors */ }
    });

    ws.on('close', () => {
      clearTimeout(timeoutId);
      if (child && child.exitCode === null) child.kill();
      _running.delete(executionId);
      cleanupFile(scriptFile);
      if (sessionFile) cleanupFile(sessionFile);
      // Wait a tick in case close event fires, avoiding double release
      if (pending.showBrowser !== true) {
        setTimeout(() => browserManager.release(), 100);
      }
    });

    ws.on('error', () => {
      clearTimeout(timeoutId);
      if (child && child.exitCode === null) child.kill();
      _running.delete(executionId);
      cleanupFile(scriptFile);
      if (sessionFile) cleanupFile(sessionFile);
      if (pending.showBrowser !== true) {
        setTimeout(() => browserManager.release(), 100);
      }
    });

  } catch (e) {
    console.error('[SCRIPTS WS ERROR]', e);
    try { ws.send(JSON.stringify({ type: 'error', message: 'Script execution failed' })); ws.close(); } catch {}
    if (child && child.exitCode === null) child.kill();
    _running.delete(executionId);
    cleanupFile(scriptFile);
    if (sessionFile) cleanupFile(sessionFile);
    if (pending.showBrowser !== true) {
      browserManager.release();
    }
  }
  })();
}

// ── Unified Backend Script Runner (For automated/manual refresh) ──────

/**
 * Run a script using the global shared BrowserServer.
 * Handles extracting standard TOKEN/OUTPUT lines.
 * Uses BrowserManager to keep memory usage low while preserving concurrency.
 */
export async function runScript(
  scriptContent: string,
  credMap: Record<string, string>,
  options?: {
    sessionState?: unknown;
    scriptMode?: 'token' | 'data';
  },
): Promise<{ success: boolean; result: unknown; token: string | null; sessionState: unknown; output: string[] }> {
  let wsEndpoint: string;
  try {
    wsEndpoint = await browserManager.getWsEndpoint();
  } catch (e) {
    return { success: false, result: null, token: null, sessionState: null, output: ['[error] Failed to launch shared browser'] };
  }

  return new Promise((resolve) => {
    const scriptFile = createEphemeralScript(scriptContent);

    const credEnv: Record<string, string> = {
      SUBTRACK_BROWSER_WS: wsEndpoint,
    };
    for (const [key, val] of Object.entries(credMap)) {
      credEnv[`SUBTRACK_${key.toUpperCase()}`] = val;
    }

    // Create ephemeral session file
    let sessionFile: string | null = null;
    if (options?.sessionState) {
      sessionFile = createEphemeralSession(options.sessionState);
      credEnv['SUBTRACK_SESSION_FILE'] = sessionFile;
    } else {
      sessionFile = createEphemeralSession({});
      credEnv['SUBTRACK_SESSION_FILE'] = sessionFile;
    }

    if (options?.scriptMode) {
      credEnv['SUBTRACK_SCRIPT_MODE'] = options.scriptMode;
    }

    const outputLines: string[] = [];
    let outputResult: unknown = null;
    let capturedToken: string | null = null;

    const proc = spawn('node', [scriptFile], {
      cwd: SCRIPTS_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: buildSafeEnv(credEnv),
    });

    proc.stdout?.on('data', (data: Buffer) => {
      for (const rawLine of data.toString('utf-8').split('\n')) {
        const text = rawLine.replace(/\r$/, '');
        if (!text) continue;
        outputLines.push(text);
        if (text.startsWith('TOKEN:')) capturedToken = text.substring(6).trim();
        if (text.startsWith('OUTPUT:')) {
          try { outputResult = JSON.parse(text.substring(7)); }
          catch { outputResult = text.substring(7); }
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      for (const rawLine of data.toString('utf-8').split('\n')) {
        const text = rawLine.replace(/\r$/, '');
        if (text) outputLines.push(`[stderr] ${text}`);
      }
    });

    const finish = (code: number | null, timedOut: boolean) => {
      browserManager.release();
      const updatedSession = sessionFile && !timedOut ? readAndDeleteEphemeralSession(sessionFile) : null;
      cleanupFile(scriptFile);
      if (timedOut && sessionFile) cleanupFile(sessionFile);

      resolve({
        success: !timedOut && code === 0,
        result: outputResult,
        token: capturedToken,
        sessionState: updatedSession,
        output: timedOut ? [...outputLines, '[timeout]'] : outputLines,
      });
    };

    const timeout = setTimeout(() => {
      proc.kill();
      finish(null, true);
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      finish(code, false);
    });
    
    proc.on('error', () => {
      clearTimeout(timeout);
      finish(null, true);
    });
  });
}
