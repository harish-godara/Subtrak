/* ══════════════════════════════════════════════════════
   SubTrack — Global Constants
   Single source of truth for all app-wide data constants.
   ══════════════════════════════════════════════════════ */

// ── Dropdown Options (defaults) ──────────────────────

export const DEFAULT_DEPARTMENTS = ['Tech', 'Product', 'CXO', 'VRD', 'SEO', 'Digital', 'Finance', 'Operations', 'HR', 'Other'];
export const DEFAULT_SERVICES = ['WABA', 'SMS', 'Email', 'AIAD', 'AWS', 'Other'];
export const DEFAULT_BILLING_CYCLES = ['one-time', 'monthly', 'quarterly', 'semi-annual', 'annual', 'credits'];
export const DEFAULT_PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Other'];

// ── Currencies ───────────────────────────────────────

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'en-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
];

/** Lookup map derived from CURRENCIES — used by formatCurrency() */
export const CURRENCY_MAP: Record<string, { symbol: string; locale: string }> =
  Object.fromEntries(CURRENCIES.map(c => [c.code, { symbol: c.symbol, locale: c.locale }]));

// ── Template Defaults ────────────────────────────────

export const DEFAULT_SCRIPT = `// Playwright automation script (Node.js ESM)
// Credentials are injected as env vars: process.env.SUBTRACK_EMAIL, process.env.SUBTRACK_PASSWORD

import { chromium } from 'playwright';

const EMAIL = process.env.SUBTRACK_EMAIL || '';
const PASSWORD = process.env.SUBTRACK_PASSWORD || '';

async function run() {
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();

  // TODO: Replace with your login + data capture logic
  await page.goto('https://example.com');
  await page.waitForTimeout(2000);

  // Print result so the backend captures it
  console.log('OUTPUT:' + JSON.stringify({ status: 'ok', balance: 0 }));

  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
`;

export const DEFAULT_CURL = `curl -X GET 'https://api.example.com/account' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json'`;
