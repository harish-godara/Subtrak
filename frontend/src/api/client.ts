/* ══════════════════════════════════════════════════════
   SubTrack — API Client (Typed)
   ══════════════════════════════════════════════════════ */

import type {
  AuthResponse,
  Subscription,
  ScriptTemplate,
  Secret,
  AdminUser,
  AdminStats,
} from '@/types';

// ── Token Management ──────────────────────────────────

const TOKEN_KEY = 'subtrack_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('subtrack_user');
}

// ── Core Fetch Wrappers ───────────────────────────────

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) {
    clearToken();
    window.location.hash = '#/auth';
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.hash = '#/auth';
    throw new Error('Session expired');
  }

  return res;
}

async function authJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

function jsonBody(data: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

// ── Auth ──────────────────────────────────────────────

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    ...jsonBody({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

export async function apiRegister(email: string, name: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    ...jsonBody({ email, name, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data;
}

export async function apiGetMe() {
  return authJson<{ id: string; email: string; name: string; role: string; settings: Record<string, unknown> }>('/api/auth/me');
}

export async function apiUpdateProfile(updates: { name?: string; settings?: Record<string, unknown> }) {
  return authJson('/api/auth/update', { method: 'PUT', ...jsonBody(updates) });
}

// ── Subscriptions ─────────────────────────────────────

export async function apiGetSubscriptions(): Promise<Subscription[]> {
  const data = await authJson<{ subscriptions: Subscription[] }>('/api/subscriptions');
  return data.subscriptions || [];
}

export async function apiGetSubscription(id: string): Promise<Subscription> {
  return authJson<Subscription>(`/api/subscriptions/${id}`);
}

export async function apiCreateSubscription(sub: Partial<Subscription>): Promise<Subscription> {
  return authJson<Subscription>('/api/subscriptions', { method: 'POST', ...jsonBody(sub) });
}

export async function apiUpdateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
  return authJson<Subscription>(`/api/subscriptions/${id}`, { method: 'PUT', ...jsonBody(updates) });
}

export async function apiDeleteSubscription(id: string): Promise<{ success: boolean }> {
  return authJson(`/api/subscriptions/${id}`, { method: 'DELETE' });
}

export async function apiRefreshSubscription(id: string): Promise<Subscription> {
  return authJson<Subscription>(`/api/subscriptions/${id}/refresh`, { method: 'POST' });
}

export interface RenewSubscriptionPayload {
  changeType?: 'renew' | 'upgrade' | 'downgrade' | 'update';
  planName?: string;
  billingCycle?: string;
  currency?: string;
  amount?: number;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  invoice?: {
    amount?: number;
    credits?: number;
    planName?: string;
    currency?: string;
    paymentMethod?: string;
    paidBy?: string;
    paymentRef?: string;
    invoiceLink?: string;
    date?: string;
    status?: string;
  } | null;
}

export async function apiRenewSubscription(id: string, payload: RenewSubscriptionPayload): Promise<Subscription> {
  return authJson<Subscription>(`/api/subscriptions/${id}/renew`, { method: 'POST', ...jsonBody(payload) });
}

export async function apiImportSubscriptions(subscriptions: Partial<Subscription>[]): Promise<{ success: boolean; imported: number }> {
  return authJson('/api/subscriptions/import', { method: 'POST', ...jsonBody({ subscriptions }) });
}

export async function apiExportSubscriptions() {
  return authJson<{ subscriptions: Subscription[]; exported_at: string }>('/api/subscriptions/export');
}

export interface DropdownOptions {
  clients: string[];
  serviceTypes: string[];
  departments: string[];
  billingCycles: string[];
  categories: string[];
  platforms: string[];
  paymentMethods: string[];
}

export async function apiGetDropdownOptions(): Promise<DropdownOptions> {
  return authJson<DropdownOptions>('/api/subscriptions/dropdown-options');
}

// ── Script Templates ──────────────────────────────────

export async function apiGetTemplates(): Promise<ScriptTemplate[]> {
  const data = await authJson<{ templates: ScriptTemplate[] }>('/api/templates');
  return data.templates || [];
}

export async function apiGetTemplate(id: string): Promise<ScriptTemplate> {
  return authJson<ScriptTemplate>(`/api/templates/${id}`);
}

export async function apiCreateTemplate(template: Partial<ScriptTemplate>): Promise<ScriptTemplate> {
  return authJson<ScriptTemplate>('/api/templates', { method: 'POST', ...jsonBody(template) });
}

export async function apiUpdateTemplate(id: string, updates: Partial<ScriptTemplate>): Promise<ScriptTemplate> {
  return authJson<ScriptTemplate>(`/api/templates/${id}`, { method: 'PUT', ...jsonBody(updates) });
}

export async function apiDeleteTemplate(id: string): Promise<{ success: boolean }> {
  return authJson(`/api/templates/${id}`, { method: 'DELETE' });
}

export async function apiDuplicateTemplate(id: string): Promise<ScriptTemplate> {
  return authJson<ScriptTemplate>(`/api/templates/${id}/duplicate`, { method: 'POST' });
}

// ── Secrets Vault ─────────────────────────────────────

export async function apiListSecrets(subscriptionId?: string): Promise<Secret[]> {
  const query = subscriptionId ? `?subscription_id=${subscriptionId}` : '';
  const data = await authJson<{ secrets: Secret[] }>(`/api/vault${query}`);
  return data.secrets || [];
}

export async function apiCheckSecretExists(subscriptionId: string, keyName: string) {
  const data = await authJson<{ exists: boolean }>(`/api/vault/has/${subscriptionId}/${keyName}`);
  return data.exists;
}

export async function apiCreateSecret(keyName: string, value: string, subscriptionId?: string) {
  return authJson('/api/vault', { method: 'POST', ...jsonBody({ key_name: keyName, value, subscription_id: subscriptionId }) });
}

export async function apiCreateSecretsBatch(secrets: { key_name: string; value: string }[], subscriptionId?: string) {
  return authJson('/api/vault/batch', { method: 'POST', ...jsonBody({ secrets, subscription_id: subscriptionId }) });
}

export async function apiDeleteSecret(secretId: string) {
  return authJson(`/api/vault/${secretId}`, { method: 'DELETE' });
}

// ── Admin ─────────────────────────────────────────────

export async function apiAdminGetUsers(): Promise<AdminUser[]> {
  const data = await authJson<{ users: AdminUser[] }>('/api/admin/users');
  return data.users || [];
}

export async function apiAdminGetUser(id: string) {
  return authJson<AdminUser & { subscriptions: Subscription[] }>(`/api/admin/users/${id}`);
}

export async function apiAdminDeleteUser(id: string) {
  return authJson(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export async function apiAdminChangeRole(id: string, role: string) {
  return authJson(`/api/admin/users/${id}/role`, { method: 'PUT', ...jsonBody({ role }) });
}

export async function apiAdminGetStats(): Promise<AdminStats> {
  return authJson<AdminStats>('/api/admin/stats');
}

// ── Proxy ─────────────────────────────────────────────

export async function executeCurl(fetchConfig: { url: string; method: string; headers: Record<string, string>; body?: string | null }) {
  return authJson('/api/proxy', { method: 'POST', ...jsonBody(fetchConfig) });
}

export async function executeSecureCurl(
  fetchConfig: { url: string; method: string; headers: Record<string, string>; body?: string | null },
  secrets?: Record<string, string>,
  subscriptionId?: string
) {
  return authJson('/api/proxy/secure', {
    method: 'POST',
    ...jsonBody({ fetchConfig, secrets, subscription_id: subscriptionId }),
  });
}

// ── Script Runner ─────────────────────────────────────

export async function runScriptWithCreds(params: {
  scriptContent: string;
  credentials?: Record<string, string>;
  subscriptionId?: string;
  sessionState?: unknown;
  scriptMode?: 'token' | 'data';
  showBrowser?: boolean;
}) {
  return authJson<{ success: boolean; execution_id: string; script_id: string }>(
    '/api/run-script-with-creds',
    { method: 'POST', ...jsonBody({
        scriptContent: params.scriptContent,
        credentials: params.credentials,
        subscription_id: params.subscriptionId,
        sessionState: params.sessionState,
        scriptMode: params.scriptMode,
        showBrowser: params.showBrowser,
      })
    },
  );
}

// ── Health Check ──────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
