/**
 * Auto-Refresh Scheduler
 *
 * Runs a per-minute cron heartbeat. On each tick:
 *   1. Checks the current HH:MM in the configured timezone.
 *   2. Queries users whose settings.autoRefreshTime matches.
 *   3. For each user (sequentially, to stagger load):
 *      - Partitions eligible subs into curl vs playwright lanes.
 *      - Curl lane: pool of 5 concurrent fetch() calls.
 *      - Playwright lane: sequential, using a shared BrowserServer.
 *   4. Logs a summary to the console.
 *
 * The shared Chromium instance is launched once for ALL users and closed
 * after all Playwright work is done. Each script gets its own BrowserContext
 * (via the auto-injected Proxy adapter in createEphemeralScript) so sessions
 * are fully isolated.
 */

import cron from 'node-cron';
import { db } from '../db/index.js';
import { users, subscriptions } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { refreshSubscriptionById } from '../routes/subscriptions.js';

// ── Dedup guard ──────────────────────────────────────────
// Prevents double-runs if the minute tick fires twice (clock drift).
const alreadyRan = new Set<string>(); // "userId:YYYY-MM-DD"

// ── Public API ───────────────────────────────────────────

export function initScheduler(): void {
  // Main heartbeat — every minute
  cron.schedule('* * * * *', () => {
    heartbeat().catch((e) => {
      console.error('[SCHEDULER] Heartbeat error:', e);
    });
  }, {
    timezone: config.SCHEDULER_TIMEZONE,
  });

  console.log(`[SCHEDULER] Initialized — heartbeat every 60s (tz: ${config.SCHEDULER_TIMEZONE})`);

  // Clear dedup set at midnight
  cron.schedule('0 0 * * *', () => {
    alreadyRan.clear();
    console.log('[SCHEDULER] Dedup guard cleared for new day');
  }, {
    timezone: config.SCHEDULER_TIMEZONE,
  });
}

// ── Heartbeat ────────────────────────────────────────────

async function heartbeat(): Promise<void> {
  // Get current HH:MM in configured timezone
  const now = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: config.SCHEDULER_TIMEZONE,
  }); // e.g. "08:00"

  // Query users whose autoRefreshTime matches current HH:MM
  const matchedUsers = await db.select().from(users).where(
    sql`${users.settings}->>'autoRefreshEnabled' = 'true'
    AND ${users.settings}->>'autoRefreshTime' = ${now}`
  );

  if (matchedUsers.length === 0) return;

  // Filter out users already processed today
  const today = new Date().toISOString().split('T')[0];
  const dueUsers = matchedUsers.filter(u => !alreadyRan.has(`${u.id}:${today}`));
  if (dueUsers.length === 0) return;

  console.log(`[SCHEDULER] ${now} — ${dueUsers.length} user(s) due for refresh`);
  const totalStart = Date.now();

  // Collect all eligible subs to decide if we need a browser
  interface UserWork {
    user: typeof matchedUsers[0];
    curlSubs: typeof allSubs;
    playwrightSubs: typeof allSubs;
    skippedOtp: number;
    skippedManual: number;
  }

  const allSubs: (typeof subscriptions.$inferSelect)[] = [];
  const work: UserWork[] = [];

  for (const user of dueUsers) {
    const subs = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, user.id));

    const curlSubs: typeof allSubs = [];
    const playwrightSubs: typeof allSubs = [];
    let skippedOtp = 0;
    let skippedManual = 0;

    for (const s of subs) {
      const int = (s.integration as Record<string, unknown>) || {};
      const intType = (int.type as string) || 'manual';

      if (intType === 'manual') { skippedManual++; continue; }
      if (s.otpRequired) { skippedOtp++; continue; }

      if (intType === 'curl') curlSubs.push(s);
      else if (intType === 'playwright') playwrightSubs.push(s);
    }

    work.push({ user, curlSubs, playwrightSubs, skippedOtp, skippedManual });
  }


    // Process each user sequentially (stagger load)
    for (const { user, curlSubs, playwrightSubs, skippedOtp, skippedManual } of work) {
      alreadyRan.add(`${user.id}:${today}`);

      const total = curlSubs.length + playwrightSubs.length;
      if (total === 0) {
        console.log(`[SCHEDULER] User "${user.name}" — no eligible subs (${skippedManual} manual, ${skippedOtp} OTP-blocked)`);
        continue;
      }

      console.log(`[SCHEDULER] User "${user.name}" — ${curlSubs.length} curl, ${playwrightSubs.length} playwright (${skippedOtp} skipped OTP)`);
      const userStart = Date.now();

      // Run both lanes in parallel
      const [curlResults, pwResults] = await Promise.all([
        // Curl lane: pool of 5 concurrent
        runWithConcurrency(
          curlSubs.map(s => async () => {
            const start = Date.now();
            const result = await refreshSubscriptionById(s.id, user.id);
            const ms = Date.now() - start;
            console.log(`[SCHEDULER]   ├─ ${s.name}: ${result.success ? '✓' : '✗'} (${ms}ms)${result.error ? ' — ' + result.error : ''}`);
            return result;
          }),
          5,
        ),
        // Playwright lane: sequential, shared browser
        runWithConcurrency(
          playwrightSubs.map(s => async () => {
            const start = Date.now();
            const result = await refreshSubscriptionById(s.id, user.id);
            const ms = Date.now() - start;
            console.log(`[SCHEDULER]   ├─ ${s.name}: ${result.success ? '✓' : '✗'} (${ms}ms)${result.error ? ' — ' + result.error : ''}`);
            return result;
          }),
          1, // Sequential — one at a time
        ),
      ]);

      const all = [...curlResults, ...pwResults];
      const ok = all.filter(r => r.success).length;
      const fail = all.filter(r => !r.success).length;
      const userMs = Date.now() - userStart;
      console.log(`[SCHEDULER]   └─ User "${user.name}" done — ✓ ${ok}, ✗ ${fail} (${userMs}ms)`);
    }


  const totalMs = Date.now() - totalStart;
  console.log(`[SCHEDULER] Refresh cycle complete (${totalMs}ms)`);
}

// ── Inline async concurrency pool ────────────────────────

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  if (tasks.length === 0) return [];
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );

  return results;
}
