/* ══════════════════════════════════════════════════════
   SubTrack — Integrate: Payload Builder
   Pure data transformation — no React, no side effects.
   Extracts the 60-line handleSave logic into testable functions.
   ══════════════════════════════════════════════════════ */

import { parseCurl, resolvePath } from '@/utils/helpers';
import type { Subscription, InvoiceRecord } from '@/types';
import type { IntegrationType, ScriptMode, CardBlock, CurlRequest } from '../integrate.types';

// ── Input types (what the Context passes in) ────────

export interface PayloadInput {
  // Form fields
  name: string; accountLabel: string; category: string; currency: string;
  billingCycle: string; color: string; notes: string; platform: string;
  department: string; ownerName: string; peopleUsing: string[];
  planName: string; serviceType: string; clientName: string;
  costAmount: string; creditsAmount: string;
  startDate: string; endDate: string; renewDate: string;
  autoRenew: boolean; invoices: InvoiceRecord[];
  // Integration
  method: IntegrationType;
  curlText: string; apiResponse: Record<string, unknown> | null;
  scriptContent: string; scriptMode: ScriptMode;
  curlRequests: CurlRequest[]; scriptResult: Record<string, unknown> | null;
  // Mapping
  fieldMapping: Record<string, string>; cardBlocks: CardBlock[];
  activeResponse: Record<string, unknown> | null;
}

// ── Build subscription payload ──────────────────────

export function buildSubscriptionPayload(input: PayloadInput): Partial<Subscription> {
  const {
    name, accountLabel, category, currency, billingCycle, color, notes, platform,
    department, ownerName, peopleUsing, planName, serviceType, clientName,
    costAmount, creditsAmount, startDate, endDate, renewDate, autoRenew, invoices,
    method, curlText, apiResponse, scriptContent, scriptMode,
    curlRequests, scriptResult, fieldMapping, cardBlocks, activeResponse,
  } = input;

  // Build integration object
  const integration: Record<string, unknown> = { type: method };
  if (method === 'curl') {
    integration.curlCommand = curlText;
    integration.fetchConfig = parseCurl(curlText);
    integration.fieldMapping = fieldMapping;
    integration.lastResponse = apiResponse;
  }
  if (method === 'playwright') {
    integration.scriptContent = scriptContent;
    integration.scriptMode = scriptMode;
    integration.fieldMapping = fieldMapping;
    if (scriptMode === 'token') {
      integration.requests = curlRequests.map(r => ({
        id: r.id, label: r.label, curlCommand: r.curlText,
        fetchConfig: r.curlText ? parseCurl(r.curlText) : null,
        lastResponse: r.response,
      }));
      const allRes: Record<string, unknown> = {};
      for (const r of curlRequests) if (r.response) allRes[r.label || r.id] = r.response;
      integration.lastResponse = allRes;
    } else {
      integration.lastResponse = scriptResult;
    }
  }

  // Build subscription object
  const sub: Partial<Subscription> = {
    name: name.trim(), account_label: accountLabel || undefined, category, currency,
    billingCycle, color, notes, platform, status: 'active',
    credits: creditsAmount ? { balance: Number(creditsAmount) } : {},
    dates: {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(renewDate ? { nextRenewal: renewDate } : {}),
    },
    cost: costAmount ? { amount: Number(costAmount), cycle: billingCycle } : {},
    customData: { _cardConfig: { blocks: cardBlocks } },
    integration: integration as Subscription['integration'],
    department: department || undefined, owner: ownerName || undefined,
    peopleUsing: peopleUsing.length > 0 ? peopleUsing.join(', ') : undefined,
    planName: planName || undefined, serviceType: serviceType || undefined,
    client: clientName || undefined, autoRenew, invoices,
  };

  // Apply field mapping
  if (activeResponse && Object.keys(fieldMapping).length > 0) {
    for (const [field, path] of Object.entries(fieldMapping)) {
      const val = resolvePath(path, activeResponse);
      if (val == null) continue;
      switch (field) {
        case 'balance': sub.credits = { ...sub.credits, balance: Number(val) }; break;
        case 'parkedBalance': sub.credits = { ...sub.credits, parkedBalance: Number(val) }; break;
        case 'totalBalance': sub.credits = { ...sub.credits, totalBalance: Number(val) }; break;
        case 'startDate': sub.dates = { ...sub.dates, startDate: String(val) }; break;
        case 'endDate': sub.dates = { ...sub.dates, endDate: String(val) }; break;
        case 'currency': sub.currency = String(val).toUpperCase(); break;
        case 'cost': sub.cost = { ...sub.cost, amount: Number(val) }; break;
        default: sub.customData = { ...sub.customData, [field]: val }; break;
      }
    }
  }

  return sub;
}

// ── Convert to API payload (snake_case) ─────────────

export function buildApiPayload(sub: Partial<Subscription>): Record<string, unknown> {
  return {
    ...sub,
    billing_cycle: sub.billingCycle,
    otp_required: sub.otpRequired || false,
    custom_data: sub.customData,
    people_using: sub.peopleUsing,
    plan_name: sub.planName,
    service_type: sub.serviceType,
    auto_renew: sub.autoRenew,
  };
}
