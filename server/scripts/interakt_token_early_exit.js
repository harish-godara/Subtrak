/**
 * Interakt — SubTrack Script (SSS + Early Exit)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔐 Credentials from backend
const EMAIL = process.env.SUBTRACK_EMAIL || '';
const PASSWORD = process.env.SUBTRACK_PASSWORD || '';

if (!EMAIL || !PASSWORD) {
  process.stdout.write('ERROR:Missing credentials\n');
  process.exit(1);
}

// ── SSS helpers ──
const emit = (prefix, value) =>
  process.stdout.write(`${prefix}:${value}\n`);

const waitForInput = () =>
  new Promise((resolve) => {
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

// ── Session setup ──
const SESSION_FILE = process.env.SUBTRACK_SESSION_FILE || null;
const SCRIPT_MODE  = process.env.SUBTRACK_SCRIPT_MODE  || 'token';

// 🎯 Immediate Early Exit Handler
let isExiting = false;

async function run() {
  emit('STATUS', 'Launching browser...');
  // Launch timeout (30s): Prevents the script from hanging indefinitely if the Chromium binary 
  // fails to launch due to system resource constraints or missing OS dependencies.
  const browser = await chromium.launch({ headless: false, timeout: 30000 });

  let context;
  if (SESSION_FILE && fs.existsSync(SESSION_FILE)) {
    try {
      context = await browser.newContext({ storageState: SESSION_FILE });
      emit('STATUS', 'Loaded saved session');
    } catch {
      context = await browser.newContext();
      emit('STATUS', 'Starting fresh session (load failed)');
    }
  } else {
    context = await browser.newContext();
    emit('STATUS', 'Starting fresh session');
  }

  const page = await context.newPage();

  let token = null;
  let orgId = null;

  // 🎯 Immediate Early Exit Handler
  async function finalizeAndExit(capturedToken) {
    if (isExiting) return;
    isExiting = true;

    emit('STATUS', 'Token captured — exiting early');
    
    // 📤 Final output MUST happen before browser closes so runner gets it
    emit('OUTPUT', JSON.stringify({ token: capturedToken }));

    // 💾 Save session and cleanup
    if (SESSION_FILE) {
      try {
        await context.storageState({ path: SESSION_FILE });
        emit('STATUS', 'Session saved');
      } catch {}
    }

    process.exit(0);
  }

  // 🎯 Token capture
  const tokenPromise = new Promise((resolve, reject) => {
    page.on('response', async (res) => {
      if (token) return;

      const authHeader = res.request().headers()['authorization'];

      if (authHeader?.startsWith('Token ')) {
        token = authHeader;
        emit('TOKEN', token);
        resolve(token);
        finalizeAndExit(token); // FORCE IMMEDIATE EXIT
      }

      // Extract orgId (optional)
      if (!orgId && res.url().includes('/organizations')) {
        try {
          const body = await res.json();
          orgId =
            body?.id ||
            body?.results?.[0]?.id ||
            body?.partner_id ||
            null;
        } catch {}
      }
    });

    // Token capture timeout (60s): Fails the promise if the authorization token isn't found in 
    // network headers within 60 seconds. This is intentionally long (60s) to give the user enough 
    // time to receive an OTP via email/SMS and manually type it into the interface.
    setTimeout(() => reject(new Error('Token timeout')), 60000);
  });

  // 🌐 Navigate
  emit('STATUS', 'Navigating to Interakt...');
  await page.goto('https://app.interakt.ai', {
    waitUntil: 'domcontentloaded',
  });

  // Navigation settle timeout (3s): A fixed delay to allow Interakt's frontend framework 
  // to complete its initial routing. This ensures the URL has actually redirected (e.g., to '/login') 
  // before we evaluate the `isLogin` check below.
  await page.waitForTimeout(3000);

  // 🔐 Login flow
  const isLogin =
    page.url().includes('login') || page.url().includes('auth');

  if (isLogin) {
    emit('STATUS', 'On login page — filling credentials...');

    // Popup dismiss timeout (2s): A short attempt to close an intrusive warning popup. 
    // It is kept brief (2s instead of the default 30s) because the popup often doesn't appear, 
    // and we want to quickly gracefully fail and proceed to the login form.
    await page
      .getByTestId('login-page-warning-popup-close-button')
      .click({ timeout: 2000 })
      .catch(() => {});

    await page.fill('input[type="email"], input[type="text"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('[data-testid="login-page-signin-button"]');

    // 🔢 OTP handling
    emit('STATUS', 'Checking for OTP...');

    // OTP visibility timeout (6s): Waits to see if the OTP input renders after submitting credentials.
    // 6 seconds is enough to account for standard API latency, but short enough that we don't stall 
    // the automation if the login succeeds without requiring 2FA.
    const otpVisible = await page
      .locator('[class*="otp"] input, input[class*="otp"], .otp-input')
      .first()
      .isVisible({ timeout: 6000 })
      .catch(() => false);

    if (otpVisible) {
      emit('INPUT_NEEDED', 'Enter OTP');

      const otp = await Promise.race([
        waitForInput(),
        // User Input timeout (60s): Limits how long the backend runner waits for the user to type 
        // the OTP into the SubTrack UI. Prevents zombie browser processes from hogging server RAM 
        // if the user abandons the login flow midway.
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OTP timeout')), 60000)
        ),
      ]);

      emit('STATUS', 'Submitting OTP...');

      const inputs = page.locator(
        '[class*="otp"] input, input[class*="otp"], .otp-input'
      );

      const count = await inputs.count();

      if (count > 1) {
        for (let i = 0; i < count; i++) {
          await inputs.nth(i).fill(otp[i] || '');
        }
      } else {
        await inputs.first().fill(otp);
      }

      await page.getByRole('button', { name: /verify/i }).click();
    }

    emit('STATUS', 'Waiting for dashboard...');
    // Dashboard redirect timeout (60s): Waits for the post-login redirect to finish. The generous 
    // 60s timeout accounts for potentially slow backend responses or heavy initial dashboard data loads.
    await page.waitForURL('**/dashboard/**', { timeout: 60000 }).catch(() => {});
  } else {
    emit('STATUS', 'Already logged in');
    // Force a reload to guarantee we capture the authorization headers again
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  // The script will normally exit via finalizeAndExit() above.
  // This is just a fallback if the execution reaches the very end.
  finalizeAndExit(token);
}

run().catch((e) => {
  if (isExiting || e.message.includes('has been closed')) {
    // Expected error when forcefully terminating a running Playwright command
    process.exit(0);
  }
  process.stdout.write(`ERROR:${e.message}\n`);
  process.exit(1);
});
