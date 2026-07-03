/**
 * SubTrack Backend — Express application entry point.
 * Starts the HTTP + WebSocket server with CORS, mounts route handlers for:
 *   - /api/auth          → User registration, login, profile
 *   - /api/subscriptions → Subscription CRUD + refresh
 *   - /api/templates     → Per-user script template management
 *   - /api/vault         → Encrypted secret storage
 *   - /api/admin         → Admin user management + stats
 *   - /api/proxy         → HTTP proxy for external API calls
 *   - /api/scripts       → Script execution endpoints
 *   - /ws/script/*       → WebSocket for real-time script I/O
 *   - /api/health        → Health check
 */

import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { eq, asc } from 'drizzle-orm';

import { config } from './config.js';
import { db, initDb, closeDb } from './db/index.js';
import { users } from './db/schema.js';
import { hashPassword } from './utils/security.js';
import { browserManager } from './services/browserManager.js';

// Route imports
import { authRouter } from './routes/auth.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { templatesRouter } from './routes/templates.js';
import { vaultRouter } from './routes/vault.js';
import { adminRouter } from './routes/admin.js';
import { proxyRouter } from './routes/proxy.js';
import { scriptsRouter, handleScriptWebSocket, cleanupLeftoverTempFiles } from './routes/scripts.js';
import { initScheduler } from './services/scheduler.js';

const app = express();

// ── Middleware ──────────────────────────────────────────

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// ── Mount Routers ──────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/vault', vaultRouter);
app.use('/api/admin', adminRouter);
app.use('/api', proxyRouter);
app.use('/api', scriptsRouter);

// ── Health Check ───────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

// ── Serve Frontend (production single-image build) ─────
// In production the Vite build is copied to ../public and served by
// Express, so a single container hosts both the SPA and the API.
if (config.NODE_ENV === 'production') {
  const clientDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public');
  app.use(express.static(clientDir));

  // SPA fallback: any non-API, non-WS GET returns index.html so client-side
  // routing (react-router) keeps working on deep links and refreshes.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// ── HTTP + WebSocket Server ────────────────────────────

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade manually for /ws/script/:scriptId/:executionId
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const match = url.pathname.match(/^\/ws\/script\/([^/]+)\/([^/]+)$/);

  if (match) {
    const [, scriptId, executionId] = match;
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleScriptWebSocket(ws, scriptId!, executionId!);
    });
  } else {
    socket.destroy();
  }
});

// ── Startup ────────────────────────────────────────────

/**
 * Sync the admin account from env on every startup.
 *
 * ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME are authoritative: change them
 * in .env and rebuild, and the admin login updates to match. We manage a
 * single admin account, located by (1) exact email match, else (2) the
 * earliest-created admin row — so changing ADMIN_EMAIL *renames* the existing
 * admin in place rather than leaving a stale account with working credentials.
 * If neither exists (fresh DB, or one with only regular users), it's created.
 */
async function syncAdmin(): Promise<void> {
  try {
    const email = config.ADMIN_EMAIL.toLowerCase().trim();
    const passwordHash = await hashPassword(config.ADMIN_PASSWORD);

    const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const managed =
      byEmail ??
      (await db.select().from(users).where(eq(users.role, 'admin')).orderBy(asc(users.createdAt)).limit(1))[0];

    if (managed) {
      await db.update(users).set({
        email,
        name: config.ADMIN_NAME,
        passwordHash,
        role: 'admin',
        updatedAt: new Date(),
      }).where(eq(users.id, managed.id));
      console.log(`[INIT] Synced admin from env: ${email}`);
    } else {
      await db.insert(users).values({
        email,
        name: config.ADMIN_NAME,
        passwordHash,
        role: 'admin',
      });
      console.log(`[INIT] Created admin user: ${email}`);
    }
  } catch (e) {
    console.error(`[INIT] Could not sync admin: ${e}`);
  }
}

async function start(): Promise<void> {
  await initDb();
  await syncAdmin();
  
  // Cleanup any leftover temp files from a previous crash/shutdown
  cleanupLeftoverTempFiles();

  // Start the auto-refresh scheduler
  initScheduler();

  server.listen(config.PORT, () => {
    console.log(`[SERVER] SubTrack API running on http://localhost:${config.PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SERVER] Shutting down...');
  await browserManager.forceClose();
  cleanupLeftoverTempFiles();
  await closeDb();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SERVER] Shutting down...');
  await browserManager.forceClose();
  cleanupLeftoverTempFiles();
  await closeDb();
  server.close();
  process.exit(0);
});

start().catch((e) => {
  console.error('[SERVER] Failed to start:', e);
  process.exit(1);
});
