/* ══════════════════════════════════════════════════════
   SubTrack — TypeScript Interfaces
   ══════════════════════════════════════════════════════ */

export interface UserSettings {
  autoRefreshEnabled?: boolean;
  autoRefreshTime?: string; // "HH:MM" format
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  settings: UserSettings;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Subscription {
  id: string;
  name: string;
  account_label?: string | null;
  logo?: string | null;
  category: string;
  status: string;
  currency: string;
  billingCycle: string;
  color: string;
  notes: string;
  otpRequired: boolean;
  credits: Credits;
  dates: Dates;
  cost: Cost;
  integration: Integration;
  customData: Record<string, unknown>;
  // Enhanced business fields
  department?: string | null;
  owner?: string | null;
  platform?: string | null;
  peopleUsing?: string | null;
  planName?: string | null;
  serviceType?: string | null;
  client?: string | null;
  autoRenew?: boolean;
  invoices?: InvoiceRecord[];
  renewals?: RenewalRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Credits {
  balance?: number;
  parkedBalance?: number;
  totalBalance?: number;
  [key: string]: unknown;
}

export interface Dates {
  startDate?: string;
  endDate?: string;
  nextRenewal?: string;
  lastRefreshed?: string;
  [key: string]: unknown;
}

export interface InvoiceRecord {
  id: string;
  invoiceLink?: string;
  amount?: number;
  credits?: number;
  planName?: string;
  paymentMethod?: string;
  paidBy?: string;
  paymentRef?: string;
  date?: string;
  // Enriched by the renewal flow (all optional, backward-compatible)
  currency?: string;
  status?: string;       // 'paid' | 'pending' | 'overdue'
  periodStart?: string;
  periodEnd?: string;
}

/** One renew / update / upgrade event in a subscription's history. */
export interface RenewalRecord {
  id: string;
  changeType: 'renew' | 'upgrade' | 'downgrade' | 'update';
  planName?: string;
  billingCycle?: string;
  currency?: string;
  amount?: number;
  periodStart?: string;
  periodEnd?: string;
  invoiceId?: string;    // links to an InvoiceRecord in invoices[]
  notes?: string;
  createdAt?: string;
}

export interface Cost {
  amount?: number;
  cycle?: string;
  [key: string]: unknown;
}

export interface Integration {
  type?: 'manual' | 'curl' | 'playwright';
  curlCommand?: string;
  fetchConfig?: FetchConfig;
  requests?: RequestConfig[];
  scriptId?: string;
  scriptContent?: string;
  scriptTemplateId?: string;
  fieldMapping?: Record<string, unknown>;
  lastResponse?: unknown;
  [key: string]: unknown;
}

export interface FetchConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
}

export interface RequestConfig {
  id?: string;
  curlCommand?: string;
  fetchConfig?: FetchConfig;
  lastResponse?: unknown;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  platform: string;
  description: string;
  script_content: string;
  credential_fields: CredentialField[];
  script_mode: 'data' | 'token';
  is_global: boolean;
  template_type: 'script' | 'api';
  created_at?: string;
  updated_at?: string;
}

export interface CredentialField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
}

export interface Secret {
  id: string;
  key_name: string;
  subscription_id?: string | null;
  created_at?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  aesthetic: 'professional' | 'cozy';
  currency: string;
  backendUrl: string;
  notifications: boolean;
}

export interface AdminUser extends User {
  subscription_count: number;
  template_count: number;
}

export interface AdminStats {
  total_users: number;
  total_subscriptions: number;
  total_templates: number;
}
