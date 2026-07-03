/* ══════════════════════════════════════════════════════
   SubTrack — Utility Functions (Typed)
   ══════════════════════════════════════════════════════ */

import type { Subscription, AppSettings } from '@/types';
import { CURRENCY_MAP } from './constants';

// ── Date Formatting ───────────────────────────────────

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Normalize any date string to a `YYYY-MM-DD` value for <input type="date">. */
export function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/**
 * Advance `startDate` by one billing cycle. Returns '' for cycles with no
 * fixed period (one-time, credits, custom) so the caller can require manual entry.
 */
export function computeNextRenewal(startDate?: string | null, billingCycle?: string | null): string {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
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
  if (add == null) return '';
  d.setMonth(d.getMonth() + add);
  return d.toISOString().slice(0, 10);
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDateShort(dateStr);
}

// ── Currency Formatting ───────────────────────────────

export function formatCurrency(amount?: number | null, currency = 'INR'): string {
  if (amount == null || isNaN(amount)) return '—';
  const cfg = CURRENCY_MAP[currency?.toUpperCase()] || CURRENCY_MAP.INR;
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: currency?.toUpperCase() || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${cfg.symbol}${Number(amount).toFixed(2)}`;
  }
}

export function formatNumber(num?: number | null): string {
  if (num == null || isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN').format(num);
}

// ── JSON Path Resolver ────────────────────────────────

export function resolvePath(path: string, obj: unknown): unknown {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc == null) return undefined;
    if (typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    if (Array.isArray(acc)) {
      const idx = parseInt(key);
      return isNaN(idx) ? undefined : acc[idx];
    }
    return undefined;
  }, obj);
}

export function flattenPaths(obj: Record<string, unknown>, prefix = ''): { path: string; value: unknown }[] {
  const paths: { path: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...flattenPaths(value as Record<string, unknown>, path));
    } else {
      paths.push({ path, value });
    }
  }
  return paths;
}

// ── Debounce ──────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Status helpers ────────────────────────────────────

export function getStatusFromDates(sub: Subscription): string {
  if (sub.status && sub.status !== 'active') return sub.status;
  if (sub.dates?.endDate) {
    const days = daysUntil(sub.dates.endDate);
    if (days !== null && days < 0) return 'expired';
  }
  return sub.status || 'active';
}

// ── Settings ──────────────────────────────────────────

const SETTINGS_KEY = 'subtrack_settings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  aesthetic: 'professional',
  currency: 'INR',
  backendUrl: 'http://localhost:8000',
  notifications: false,
};

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// ── Theme ─────────────────────────────────────────────

export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function applyAesthetic(aesthetic: 'professional' | 'cozy'): void {
  document.documentElement.setAttribute('data-aesthetic', aesthetic);
}

// ── Curl Parser ───────────────────────────────────────

export function parseCurl(curlStr: string): { url: string; method: string; headers: Record<string, string>; body?: string | null } {
  const result: { url: string; method: string; headers: Record<string, string>; body?: string | null } = {
    url: '',
    method: 'GET',
    headers: {},
    body: null,
  };

  // Normalize line continuations
  const normalized = curlStr.replace(/\\\s*\n/g, ' ').trim();

  // Tokenize
  const tokens: string[] = [];
  let current = '';
  let inQuote = '';

  for (const char of normalized) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = '';
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === ' ' || char === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);

  // Parse tokens
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t === 'curl') continue;

    if (t === '-X' || t === '--request') {
      result.method = tokens[++i]?.toUpperCase() || 'GET';
    } else if (t === '-H' || t === '--header') {
      const header = tokens[++i] || '';
      const colonIdx = header.indexOf(':');
      if (colonIdx > 0) {
        result.headers[header.slice(0, colonIdx).trim()] = header.slice(colonIdx + 1).trim();
      }
    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
      result.body = tokens[++i] || '';
      if (result.method === 'GET') result.method = 'POST';
    } else if (t === '-u' || t === '--user') {
      const creds = tokens[++i] || '';
      result.headers['Authorization'] = 'Basic ' + btoa(creds);
    } else if (t === '-b' || t === '--cookie') {
      result.headers['Cookie'] = tokens[++i] || '';
    } else if (t.startsWith('http://') || t.startsWith('https://')) {
      result.url = t;
    } else if (t === '--compressed' || t === '-k' || t === '--insecure' || t === '-s' || t === '--silent' || t === '-L' || t === '--location') {
      // Skip known flags
    }
  }

  return result;
}

// ── Value Formatting ──────────────────────────────────

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60);
  return String(value).slice(0, 60);
}
