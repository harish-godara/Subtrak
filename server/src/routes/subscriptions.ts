/**
 * Subscriptions Routes — full CRUD, refresh, import/export.
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscriptions, secrets } from '../db/schema.js';
import { authMiddleware } from '../utils/security.js';
import { decryptValue } from '../utils/encryption.js';
import { runScript } from './scripts.js';
import { randomUUID } from 'node:crypto';

export const subscriptionsRouter = Router();

// Apply auth middleware to all routes
subscriptionsRouter.use(authMiddleware);

// ── Schemas ────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1),
  account_label: z.string().nullish(),
  logo: z.string().nullish(),
  category: z.string().default('Other'),
  status: z.string().default('active'),
  currency: z.string().default('INR'),
  billing_cycle: z.string().default('one-time'),
  color: z.string().default('#4F46E5'),
  notes: z.string().default(''),
  otp_required: z.boolean().default(false),
  credits: z.record(z.unknown()).default({}),
  dates: z.record(z.unknown()).default({}),
  cost: z.record(z.unknown()).default({}),
  integration: z.record(z.unknown()).default({}),
  custom_data: z.record(z.unknown()).default({}),
  // Enhanced business fields
  department: z.string().nullish(),
  owner: z.string().nullish(),
  platform: z.string().nullish(),
  people_using: z.string().nullish(),
  plan_name: z.string().nullish(),
  service_type: z.string().nullish(),
  client: z.string().nullish(),
  auto_renew: z.boolean().default(false),
  invoices: z.array(z.record(z.unknown())).default([]),
  renewals: z.array(z.record(z.unknown())).default([]),
});

const updateSchema = createSchema.partial();

// Payload for POST /:id/renew — renew / update / upgrade a subscription.
const renewSchema = z.object({
  changeType: z.enum(['renew', 'upgrade', 'downgrade', 'update']).default('renew'),
  planName: z.string().nullish(),
  billingCycle: z.string().nullish(),
  currency: z.string().nullish(),
  amount: z.number().nullish(),       // price for the new term → cost.amount
  periodStart: z.string().nullish(),  // term start (defaults to current nextRenewal/endDate/today)
  periodEnd: z.string().nullish(),    // term end / next renewal (defaults to periodStart + billing cycle)
  notes: z.string().nullish(),
  invoice: z.object({
    amount: z.number().nullish(),
    credits: z.number().nullish(),
    planName: z.string().nullish(),
    currency: z.string().nullish(),
    paymentMethod: z.string().nullish(),
    paidBy: z.string().nullish(),
    paymentRef: z.string().nullish(),
    invoiceLink: z.string().nullish(),
    date: z.string().nullish(),
    status: z.string().nullish(),
  }).nullish(),
});

// ── Helpers ────────────────────────────────────────────

function subToDict(s: typeof subscriptions.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    account_label: s.accountLabel,
    logo: s.logo,
    category: s.category,
    status: s.status,
    currency: s.currency,
    billingCycle: s.billingCycle,
    color: s.color,
    notes: s.notes,
    otpRequired: s.otpRequired,
    credits: s.credits || {},
    dates: s.dates || {},
    cost: s.cost || {},
    integration: s.integration || {},
    customData: s.customData || {},
    // Enhanced business fields
    department: s.department,
    owner: s.owner,
    platform: s.platform,
    peopleUsing: s.peopleUsing,
    planName: s.planName,
    serviceType: s.serviceType,
    client: s.client,
    autoRenew: s.autoRenew,
    invoices: s.invoices || [],
    renewals: s.renewals || [],
    createdAt: s.createdAt?.toISOString() || null,
    updatedAt: s.updatedAt?.toISOString() || null,
  };
}

async function getOwnSub(subId: string, userId: string, role: string) {
  const conditions = [eq(subscriptions.id, subId)];
  if (role !== 'admin') {
    conditions.push(eq(subscriptions.userId, userId));
  }
  const [s] = await db.select().from(subscriptions).where(and(...conditions)).limit(1);
  return s || null;
}

/**
 * Walk a dot-separated path through nested dicts/arrays.
 */
function resolvePath(path: string, data: unknown): unknown {
  if (!data || !path) return null;
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx) || idx < 0 || idx >= current.length) return null;
      current = current[idx];
    } else {
      return null;
    }
  }
  return current;
}

/**
 * Compute the next renewal date by advancing `startDate` by one billing cycle.
 * Returns null for cycles with no fixed period (one-time, credits, custom).
 */
function computeNextRenewal(startDate?: string | null, billingCycle?: string | null): string | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  const cycle = (billingCycle || '').toLowerCase().trim();
  if (cycle === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  const months: Record<string, number> = {
    monthly: 1, quarterly: 3, 'semi-annual': 6, 'semi-annually': 6,
    annual: 12, annually: 12, yearly: 12,
  };
  const add = months[cycle];
  if (add == null) return null; // one-time / credits / unknown → not auto-computable
  d.setMonth(d.getMonth() + add);
  return d.toISOString().slice(0, 10);
}

// ── Endpoints ──────────────────────────────────────────

// GET /api/subscriptions
subscriptionsRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const subs = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(subscriptions.name);
    res.json({ subscriptions: subs.map(subToDict) });
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/subscriptions/export
subscriptionsRouter.get('/export', async (req, res) => {
  try {
    const user = req.user!;
    const subs = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, user.id));
    res.json({ subscriptions: subs.map(subToDict), exported_at: new Date().toISOString() });
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/subscriptions/dropdown-options — distinct values for smart dropdowns
subscriptionsRouter.get('/dropdown-options', async (req, res) => {
  try {
    const user = req.user!;
    const rows = await db.select({
      client: subscriptions.client,
      serviceType: subscriptions.serviceType,
      department: subscriptions.department,
      billingCycle: subscriptions.billingCycle,
      invoices: subscriptions.invoices,
      category: subscriptions.category,
      platform: subscriptions.platform,
    }).from(subscriptions).where(eq(subscriptions.userId, user.id));

    // Extract distinct payment methods from invoices JSONB arrays
    const paymentMethods = new Set<string>();
    for (const row of rows) {
      const invList = (row.invoices as Record<string, unknown>[]) || [];
      for (const inv of invList) {
        if (inv.paymentMethod) paymentMethods.add(inv.paymentMethod as string);
      }
    }

    res.json({
      clients: [...new Set(rows.map(r => r.client).filter(Boolean))] as string[],
      serviceTypes: [...new Set(rows.map(r => r.serviceType).filter(Boolean))] as string[],
      departments: [...new Set(rows.map(r => r.department).filter(Boolean))] as string[],
      billingCycles: [...new Set(rows.map(r => r.billingCycle).filter(Boolean))] as string[],
      categories: [...new Set(rows.map(r => r.category).filter(Boolean))] as string[],
      platforms: [...new Set(rows.map(r => r.platform).filter(Boolean))] as string[],
      paymentMethods: [...paymentMethods],
    });
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/subscriptions/:id
subscriptionsRouter.get('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const s = await getOwnSub(req.params.id, user.id, user.role);
    if (!s) { res.status(404).json({ detail: 'Subscription not found' }); return; }
    res.json(subToDict(s));
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/subscriptions
subscriptionsRouter.post('/', async (req, res) => {
  try {
    const user = req.user!;
    const body = createSchema.parse(req.body);

    const [s] = await db.insert(subscriptions).values({
      userId: user.id,
      name: body.name.trim(),
      accountLabel: body.account_label,
      logo: body.logo,
      category: body.category,
      status: body.status,
      currency: body.currency,
      billingCycle: body.billing_cycle,
      color: body.color,
      notes: body.notes,
      otpRequired: body.otp_required,
      credits: body.credits,
      dates: body.dates,
      cost: body.cost,
      integration: body.integration,
      customData: body.custom_data,
      // Enhanced business fields
      department: body.department,
      owner: body.owner,
      platform: body.platform,
      peopleUsing: body.people_using,
      planName: body.plan_name,
      serviceType: body.service_type,
      client: body.client,
      autoRenew: body.auto_renew,
      invoices: body.invoices,
      renewals: body.renewals,
    }).returning();

    res.json(subToDict(s));
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/subscriptions/:id
subscriptionsRouter.put('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const s = await getOwnSub(req.params.id, user.id, user.role);
    if (!s) { res.status(404).json({ detail: 'Subscription not found' }); return; }

    const body = updateSchema.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.account_label !== undefined) updates.accountLabel = body.account_label;
    if (body.logo !== undefined) updates.logo = body.logo;
    if (body.category !== undefined) updates.category = body.category;
    if (body.status !== undefined) updates.status = body.status;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.billing_cycle !== undefined) updates.billingCycle = body.billing_cycle;
    if (body.color !== undefined) updates.color = body.color;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.otp_required !== undefined) updates.otpRequired = body.otp_required;
    if (body.credits !== undefined) updates.credits = body.credits;
    if (body.dates !== undefined) updates.dates = body.dates;
    if (body.cost !== undefined) updates.cost = body.cost;
    if (body.integration !== undefined) updates.integration = body.integration;
    if (body.custom_data !== undefined) updates.customData = body.custom_data;
    // Enhanced business fields
    if (body.department !== undefined) updates.department = body.department;
    if (body.owner !== undefined) updates.owner = body.owner;
    if (body.platform !== undefined) updates.platform = body.platform;
    if (body.people_using !== undefined) updates.peopleUsing = body.people_using;
    if (body.plan_name !== undefined) updates.planName = body.plan_name;
    if (body.service_type !== undefined) updates.serviceType = body.service_type;
    if (body.client !== undefined) updates.client = body.client;
    if (body.auto_renew !== undefined) updates.autoRenew = body.auto_renew;
    if (body.invoices !== undefined) updates.invoices = body.invoices;
    if (body.renewals !== undefined) updates.renewals = body.renewals;

    const [updated] = await db.update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, s.id))
      .returning();

    res.json(subToDict(updated));
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/subscriptions/:id
subscriptionsRouter.delete('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const s = await getOwnSub(req.params.id, user.id, user.role);
    if (!s) { res.status(404).json({ detail: 'Subscription not found' }); return; }

    await db.delete(subscriptions).where(eq(subscriptions.id, s.id));
    res.json({ success: true });
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/subscriptions/import
subscriptionsRouter.post('/import', async (req, res) => {
  try {
    const user = req.user!;
    const subsData: Record<string, unknown>[] = req.body.subscriptions || [];
    let created = 0;

    for (const item of subsData) {
      await db.insert(subscriptions).values({
        userId: user.id,
        name: (item.name as string) || 'Untitled',
        accountLabel: (item.account_label as string) || (item.accountLabel as string) || null,
        logo: (item.logo as string) || null,
        category: (item.category as string) || 'Other',
        status: (item.status as string) || 'active',
        currency: (item.currency as string) || 'INR',
        billingCycle: (item.billingCycle as string) || (item.billing_cycle as string) || 'one-time',
        color: (item.color as string) || '#4F46E5',
        notes: (item.notes as string) || '',
        otpRequired: (item.otpRequired as boolean) || (item.otp_required as boolean) || false,
        credits: (item.credits as Record<string, unknown>) || {},
        dates: (item.dates as Record<string, unknown>) || {},
        cost: (item.cost as Record<string, unknown>) || {},
        integration: (item.integration as Record<string, unknown>) || {},
        customData: (item.customData as Record<string, unknown>) || (item.custom_data as Record<string, unknown>) || {},
      });
      created++;
    }

    res.json({ success: true, imported: created });
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── Reusable refresh pipeline (used by route + scheduler) ──────

/**
 * Core refresh logic extracted for reuse by both the API route and
 * the automated scheduler.
 */
export async function refreshSubscriptionById(
  subId: string,
  userId: string,
): Promise<{ success: boolean; updated?: ReturnType<typeof subToDict>; error?: string }> {
  const [s] = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, userId)))
    .limit(1);
  if (!s) return { success: false, error: 'Subscription not found' };

  const integration = (s.integration || {}) as Record<string, unknown>;
  const intType = (integration.type as string) || 'manual';
  const scriptMode = (integration.scriptMode as string) || 'data';

  if (intType === 'manual') return { success: false, error: 'Manual subscription' };

  // Load all secrets for this subscription
  const secretRows = await db.select().from(secrets)
    .where(and(eq(secrets.userId, userId), eq(secrets.subscriptionId, s.id)));

  const secretMap: Record<string, string> = {};
  for (const sec of secretRows) {
    secretMap[sec.keyName] = decryptValue(sec.encryptedValue);
  }

  // Helper: replace {{secret:KEY}}, {{KEY}}, and {{TOKEN}} placeholders
  let capturedToken = '';

  function injectAll(text: string): string {
    if (!text) return text;
    text = text.replace(/\{\{TOKEN\}\}/g, capturedToken);
    text = text.replace(/\{\{secret:([^}]+)\}\}/g, (_, key) => secretMap[key] || `{{secret:${key}}}`);
    text = text.replace(/\{\{([^}]+)\}\}/g, (_, key) => secretMap[key] || `{{${key}}}`);
    return text;
  }

  let scriptResult: unknown = null;

  // ── Step 1: Run Playwright script (if applicable) ──
  if (intType === 'playwright' && integration.scriptContent) {
    // Execute script using the unified global runner
    const scriptRun = await runScript(
      integration.scriptContent as string,
      secretMap,
      { sessionState: s.browserSession, scriptMode: scriptMode as 'token' | 'data' },
    );

    scriptResult = scriptRun.result;

    // Save updated browser session back to DB (stateless server)
    if (scriptRun.sessionState) {
      await db.update(subscriptions).set({
        browserSession: scriptRun.sessionState,
        updatedAt: new Date(),
      }).where(eq(subscriptions.id, s.id));
    }

    if (!scriptRun.success) {
      await db.update(subscriptions).set({ otpRequired: true, updatedAt: new Date() })
        .where(eq(subscriptions.id, s.id));
      return {
        success: false,
        error: 'Script execution failed (may require OTP)',
      };
    }

    // In token mode, extract the token from the result
    if (scriptMode === 'token') {
      if (scriptRun.token) {
        capturedToken = scriptRun.token;
      } else if (scriptResult && typeof scriptResult === 'object') {
        const resultObj = scriptResult as Record<string, unknown>;
        capturedToken = (resultObj.token as string) || (resultObj.Token as string) || (resultObj.authorization as string) || '';
      }
    }
  }

  // ── Step 2: Execute curl requests ──
  const requestsList = (integration.requests as Record<string, unknown>[]) || [];
  let lastResponse: unknown = null;

  // 2a: Handle simple curl type (top-level fetchConfig, no requests array)
  if (intType === 'curl') {
    const topFetchConfig = (integration.fetchConfig as Record<string, unknown>) || {};
    if (topFetchConfig.url) {
      const url = injectAll(topFetchConfig.url as string);
      const method = ((topFetchConfig.method as string) || 'GET').toUpperCase();
      const headers: Record<string, string> = {};
      const rawHeaders = (topFetchConfig.headers as Record<string, string>) || {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        headers[k] = injectAll(v);
      }
      let body = topFetchConfig.body as string | undefined;
      if (body) body = injectAll(body);

      try {
        const resp = await fetch(url, { method, headers, body: body || undefined });
        let respBody: unknown;
        try { respBody = await resp.json(); } catch { respBody = await resp.text(); }
        lastResponse = respBody;
        integration.lastResponse = respBody;
      } catch (e) {
        console.error('[REFRESH] Simple curl failed:', e);
        integration.lastResponse = { error: String(e) };
      }
    }
  }

  // 2b: Handle token-mode requests array
  if (requestsList.length > 0) {
    for (const reqConfig of requestsList) {
      const fetchConfig = (reqConfig.fetchConfig as Record<string, unknown>) || {};
      if (!fetchConfig.url) continue;

      const url = injectAll(fetchConfig.url as string);
      const method = ((fetchConfig.method as string) || 'GET').toUpperCase();
      const headers: Record<string, string> = {};
      const rawHeaders = (fetchConfig.headers as Record<string, string>) || {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        headers[k] = injectAll(v);
      }
      let body = fetchConfig.body as string | undefined;
      if (body) body = injectAll(body);

      try {
        const resp = await fetch(url, { method, headers, body: body || undefined });
        let respBody: unknown;
        try { respBody = await resp.json(); } catch { respBody = await resp.text(); }

        reqConfig.lastResponse = respBody;
        lastResponse = respBody;
      } catch (e) {
        reqConfig.lastResponse = { error: String(e) };
      }
    }

    // Build namespaced response dict (matches frontend getActiveResponse for token mode)
    // Field mapping paths are stored as "Request Label.path.to.field"
    if (scriptMode === 'token') {
      const namespacedResponse: Record<string, unknown> = {};
      for (const reqConfig of requestsList) {
        const label = (reqConfig.label as string) || (reqConfig.id as string) || '';
        if (reqConfig.lastResponse) {
          namespacedResponse[label] = reqConfig.lastResponse;
        }
      }
      if (Object.keys(namespacedResponse).length > 0) {
        lastResponse = namespacedResponse;
      }
    }
  }

  // ── Step 3: Apply field mappings ──
  const fieldMapping = (integration.fieldMapping as Record<string, unknown>) || {};
  const updatedCredits = { ...(s.credits as Record<string, unknown> || {}) };
  const updatedDates = { ...(s.dates as Record<string, unknown> || {}) };
  // Preserve ALL existing custom data as the starting base
  // Fresh mapped values will overwrite specific keys; unmapped keys survive intact
  const existingCustom = (s.customData as Record<string, unknown>) || {};
  const updatedCustom: Record<string, unknown> = { ...existingCustom };
  let updatedCurrency = s.currency;

  for (const [field, mapping] of Object.entries(fieldMapping)) {
    let dataSource: unknown;
    let mPath: string;

    if (typeof mapping === 'string') {
      // Simple path refers to the script result (data mode) or last curl response
      dataSource = scriptMode === 'data' && scriptResult ? scriptResult : lastResponse;
      mPath = mapping;
    } else if (mapping && typeof mapping === 'object') {
      const m = mapping as Record<string, string>;
      const reqId = m.reqId || '';
      mPath = m.path || '';
      if (reqId === 'script') {
        dataSource = scriptResult || {};
      } else {
        const matchedReq = requestsList.find(r => (r.id as string) === reqId);
        dataSource = matchedReq ? matchedReq.lastResponse : {};
      }
    } else {
      continue;
    }

    const value = resolvePath(mPath, dataSource);
    if (value == null) continue;

    switch (field) {
      case 'balance': updatedCredits.balance = value; break;
      case 'parkedBalance': updatedCredits.parkedBalance = value; break;
      case 'totalBalance': updatedCredits.totalBalance = value; break;
      case 'currency': updatedCurrency = String(value).toUpperCase(); break;
      case 'startDate': updatedDates.startDate = value; break;
      case 'endDate': updatedDates.endDate = value; break;
      default: updatedCustom[field] = value; break;
    }
  }

  // Update the subscription
  updatedDates.lastRefreshed = new Date().toISOString();
  integration.requests = requestsList;
  integration.lastResponse = lastResponse;

  const [updated] = await db.update(subscriptions).set({
    credits: updatedCredits,
    dates: updatedDates,
    customData: updatedCustom,
    currency: updatedCurrency,
    integration,
    otpRequired: false,
    updatedAt: new Date(),
  }).where(eq(subscriptions.id, s.id)).returning();

  return { success: true, updated: subToDict(updated) };
}

// POST /api/subscriptions/:id/refresh
subscriptionsRouter.post('/:id/refresh', async (req, res) => {
  try {
    const user = req.user!;
    const s = await getOwnSub(req.params.id, user.id, user.role);
    if (!s) { res.status(404).json({ detail: 'Subscription not found' }); return; }

    const result = await refreshSubscriptionById(req.params.id, user.id);

    if (!result.success) {
      res.status(400).json({ detail: result.error });
      return;
    }

    res.json(result.updated);
  } catch (e) {
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/subscriptions/:id/renew — renew / update / upgrade a subscription.
// Appends a renewal record (+ optional invoice) to history and updates the
// subscription's *current* plan / pricing / term / status atomically.
subscriptionsRouter.post('/:id/renew', async (req, res) => {
  try {
    const user = req.user!;
    const s = await getOwnSub(req.params.id, user.id, user.role);
    if (!s) { res.status(404).json({ detail: 'Subscription not found' }); return; }

    const body = renewSchema.parse(req.body);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const prevDates = (s.dates as Record<string, unknown>) || {};
    const prevCost = (s.cost as Record<string, unknown>) || {};
    const prevInvoices = Array.isArray(s.invoices) ? (s.invoices as Record<string, unknown>[]) : [];
    const prevRenewals = Array.isArray(s.renewals) ? (s.renewals as Record<string, unknown>[]) : [];

    // Resolve the new term.
    const currency = body.currency || s.currency;
    const billingCycle = body.billingCycle || s.billingCycle;
    const planName = body.planName ?? s.planName ?? null;
    const periodStart = body.periodStart
      || (prevDates.nextRenewal as string)
      || (prevDates.endDate as string)
      || today;
    const periodEnd = body.periodEnd || computeNextRenewal(periodStart, billingCycle);

    // Build an invoice record when invoice details or a price were supplied.
    const inv = body.invoice;
    const hasInvoice = !!inv || body.amount != null;
    let invoiceId: string | null = null;
    const newInvoices = [...prevInvoices];
    if (hasInvoice) {
      invoiceId = randomUUID();
      newInvoices.push({
        id: invoiceId,
        amount: inv?.amount ?? body.amount ?? undefined,
        credits: inv?.credits ?? undefined,
        planName: inv?.planName ?? planName ?? undefined,
        currency,
        paymentMethod: inv?.paymentMethod ?? undefined,
        paidBy: inv?.paidBy ?? undefined,
        paymentRef: inv?.paymentRef ?? undefined,
        invoiceLink: inv?.invoiceLink ?? undefined,
        date: inv?.date ?? periodStart,
        status: inv?.status ?? 'paid',
        periodStart,
        periodEnd: periodEnd ?? undefined,
      });
    }

    // Build the renewal history record.
    const renewalRecord = {
      id: randomUUID(),
      changeType: body.changeType,
      planName: planName ?? undefined,
      billingCycle,
      currency,
      amount: body.amount ?? inv?.amount ?? undefined,
      periodStart,
      periodEnd: periodEnd ?? undefined,
      invoiceId: invoiceId ?? undefined,
      notes: body.notes ?? undefined,
      createdAt: now.toISOString(),
    };
    const newRenewals = [...prevRenewals, renewalRecord];

    // Update the subscription's *current* state to reflect the latest term.
    const newDates: Record<string, unknown> = {
      ...prevDates,
      startDate: prevDates.startDate || periodStart,
      lastRenewedAt: now.toISOString(),
    };
    if (periodEnd) {
      newDates.nextRenewal = periodEnd;
      newDates.endDate = periodEnd;
    }
    const newCost: Record<string, unknown> = {
      ...prevCost,
      amount: body.amount ?? prevCost.amount,
      cycle: billingCycle,
    };

    const [updated] = await db.update(subscriptions).set({
      planName,
      billingCycle,
      currency,
      cost: newCost,
      dates: newDates,
      invoices: newInvoices,
      renewals: newRenewals,
      status: 'active', // renewing reactivates an expired/cancelled subscription
      updatedAt: now,
    }).where(eq(subscriptions.id, s.id)).returning();

    res.json(subToDict(updated));
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[SUBSCRIPTIONS ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
