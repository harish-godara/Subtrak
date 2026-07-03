/**
 * Gallabox — SubTrack Script (SSS + Ephemeral Session + Mode-Aware Exit)
 *
 * Reads session from SUBTRACK_SESSION_FILE (ephemeral, backend-created from DB).
 * Writes updated session back to the same file on completion.
 *
 * SUBTRACK_SCRIPT_MODE:
 *   'token' → capture token, save session, exit immediately
 *   'data'  → capture token, call API, emit full JSON output
 */

import { chromium } from 'playwright';
import fs from 'fs';

// ── Credentials & config from backend env ──
const EMAIL        = process.env.SUBTRACK_EMAIL        || '';
const PASSWORD     = process.env.SUBTRACK_PASSWORD     || '';
const SESSION_FILE = process.env.SUBTRACK_SESSION_FILE || null;
const SCRIPT_MODE  = process.env.SUBTRACK_SCRIPT_MODE  || 'data';

if (!EMAIL || !PASSWORD) {
  process.stdout.write('ERROR:SUBTRACK_EMAIL and SUBTRACK_PASSWORD are required\n');
  process.exitCode = 1;
  process.exit();
}

// ── SSS helpers ──
const emit = (prefix, value) => process.stdout.write(`${prefix}:${value}\n`);

function waitForInput() {
  return new Promise((resolve) => {
    let buffer = '';
    const handler = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('INPUT:')) {
          process.stdin.removeListener('data', handler);
          resolve(line.slice(6).trim());
          return;
        }
      }
      buffer = lines[lines.length - 1] || '';
    };
    process.stdin.on('data', handler);
  });
}

// 🎯 Early exit tracking (module scope so error handler can access it)
let isExiting = false;

// ── Main ──
async function run() {
  emit('STATUS', 'Launching browser...');

  const browser = await chromium.launch({
    headless: true,
    timeout: 30000,
    args: ['--disable-blink-features=AutomationControlled']
  });

  // Load session from ephemeral file (backend created from DB)
  let context;
  if (SESSION_FILE && fs.existsSync(SESSION_FILE)) {
    try {
      const stateData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      if (stateData.cookies || stateData.origins) {
        context = await browser.newContext({ storageState: SESSION_FILE });
        emit('STATUS', 'Loaded saved session from DB');
      } else {
        context = await browser.newContext();
        emit('STATUS', 'Starting fresh session');
      }
    } catch {
      context = await browser.newContext();
      emit('STATUS', 'Starting fresh session');
    }
  } else {
    context = await browser.newContext();
    emit('STATUS', 'Starting fresh session (no session file)');
  }

  const page = await context.newPage();

  // 🎯 Immediate Early Exit Handler
  async function finalizeAndExit(capturedToken, outputData = null) {
    if (isExiting) return;
    isExiting = true;

    emit('STATUS', 'Token/Data captured — exiting early');

    // 📤 Final output MUST happen before browser closes
    if (outputData) {
      emit('OUTPUT', JSON.stringify(outputData));
    } else if (capturedToken) {
      emit('OUTPUT', JSON.stringify({ token: capturedToken }));
    }
    
    // 💾 Save session and cleanup
    if (SESSION_FILE) {
      try {
        await context.storageState({ path: SESSION_FILE });
        emit('STATUS', 'Session saved');
      } catch {}
    }

    try {
      await context.close();
      await browser.close();
    } catch {}

    process.exit(0);
  }

  // Token capture via request interception
  let token = null;
  let isLoginPage = false;

  page.on('request', async (req) => {
    const headers = req.headers();
    const auth = headers['authorization'] || headers['Authorization'];
    if (!token && auth && auth.includes('Bearer')) {
      token = auth;
      emit('TOKEN', token);
      
      // If we are already logged in (not a fresh login flow), we can exit instantly!
      // But if we are in the middle of a fresh login, we should let the script reach the dashboard
      // first so the browser properly writes the session cookies before we save the state.
      if (!isLoginPage && SCRIPT_MODE === 'token') {
        finalizeAndExit(token);
      }
    }
  });

  // Navigate
  emit('STATUS', 'Navigating to Gallabox...');
  await page.goto('https://app.gallabox.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Login flow
  isLoginPage = await page.locator('input[type="password"]').isVisible().catch(() => false);

  if (isLoginPage) {
    emit('STATUS', 'On login page — filling credentials...');

    try { await page.keyboard.press('Escape'); } catch {}

    try {
      await page.fill('input[type="text"], input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button[type="submit"]');
    } catch (e) {
      emit('ERROR', `Login error: ${e.message}`);
    }

    // OTP handling
    emit('STATUS', 'Checking for OTP...');
    const otpInputs = page.locator('input[aria-label="Please enter your pin code"]');
    await page.waitForTimeout(6000);
    const count = await otpInputs.count();

    if (count >= 4) {
      emit('STATUS', `OTP detected with ${count} inputs`);
      emit('INPUT_NEEDED', 'Enter OTP');
      const otp = await waitForInput();
      emit('STATUS', 'Filling OTP...');

      for (let i = 0; i < otp.length && i < count; i++) {
        await otpInputs.nth(i).fill(otp[i]);
      }

      emit('STATUS', 'Submitting OTP...');
      try {
        await page.getByRole('button', { name: /verify|submit|continue/i }).click();
      } catch {
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(10000);
    } else {
      emit('STATUS', 'No OTP detected, continuing...');
      await page.waitForTimeout(15000);
    }
  } else {
    emit('STATUS', 'Already logged in');
    await page.waitForTimeout(8000);
  }

  // Token wait fallback
  if (!token) {
    emit('STATUS', 'Waiting for token...');
    await page.waitForTimeout(10000);
  }

  if (!token) {
    emit('STATUS', 'Reloading page to trigger requests...');
    await page.reload();
    await page.waitForTimeout(5000);
  }

  if (!token) {
    emit('ERROR', 'Token not captured');
    await browser.close();
    return;
  }

  // The script will normally exit via finalizeAndExit() earlier.
  // This is a fallback if execution reaches this point.
  if (SCRIPT_MODE === 'token') {
    finalizeAndExit(token);
  }

  // ═══════ DATA MODE — continue to API calls ═══════
  emit('STATUS', 'Data Mode — fetching API data...');

  try {
    const res = await fetch('https://server.gallabox.com/api/me', {
      headers: { authorization: token }
    });
    const data = await res.json();
    finalizeAndExit(token, data);
  } catch (e) {
    emit('ERROR', e.message);
    finalizeAndExit(token);
  }
}

run().catch((e) => {
  if (isExiting || e.message.includes('has been closed')) {
    process.exit(0);
  }
  process.stdout.write(`ERROR:${e.message}\n`);
  process.exitCode = 1;
});