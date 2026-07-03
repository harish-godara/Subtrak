/* ══════════════════════════════════════════════════════
   SubTrack — Integrate: Type Definitions
   Single source of truth. No constants, no helpers.
   ══════════════════════════════════════════════════════ */

// ── Step / Mode Types ───────────────────────────────
export type IntegrationType = 'curl' | 'playwright' | 'manual';
export type ScriptMode = 'data' | 'token';
export type Step = 'method' | 'info' | 'config' | 'curls' | 'map' | 'done';

// ── Data Models ─────────────────────────────────────
export interface CardBlock {
  id: string;
  type: 'balance' | 'cost' | 'dates' | 'custom';
  fieldKey?: string;
  label: string;
}

export interface CurlRequest {
  id: string;
  label: string;
  curlText: string;
  response: Record<string, unknown> | null;
  testing: boolean;
}

export interface WsMessage {
  type: 'output' | 'error' | 'complete' | 'status';
  stream?: 'stdout' | 'stderr';
  text?: string;
  message?: string;
  result?: unknown;
  needs_input?: boolean;
}

export interface TerminalLine {
  text: string;
  stream: string;
}
