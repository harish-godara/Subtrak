/* ══════════════════════════════════════════════════════
   SubTrack — Terminal
   Dark terminal output panel with colored lines.
   ══════════════════════════════════════════════════════ */

import { Terminal as TerminalIcon } from 'lucide-react';
import type { TerminalLine } from '../integrate.types';

interface TerminalProps {
  lines: TerminalLine[];
  running: boolean;
  needsInput: boolean;
  otpInput: string;
  onOtpChange: (v: string) => void;
  onSendInput: () => void;
  terminalRef: React.RefObject<HTMLDivElement | null>;
}

export function Terminal({ lines, running, needsInput, otpInput, onOtpChange, onSendInput, terminalRef }: TerminalProps) {
  if (lines.length === 0 && !running) return null;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TerminalIcon size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Terminal</span>
        </div>
        {running && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', color: '#facc15' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#facc15', animation: 'pulse 1.5s infinite' }} />
            Running...
          </div>
        )}
      </div>
      <div ref={terminalRef} style={{ background: '#0d1117', padding: '16px 20px', height: 320, overflow: 'auto', fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: '0.75rem', lineHeight: 1.8 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.stream === 'stderr' ? '#f87171' : line.stream === 'status' ? '#60a5fa' : line.stream === 'input' ? '#a78bfa' : '#d1fae5', padding: '1px 0' }}>{line.text}</div>
        ))}
        {running && <div style={{ color: '#facc15', fontSize: '1rem' }}>▋</div>}
      </div>
      {needsInput && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#161b22' }}>
          <input className="form-input" value={otpInput} onChange={e => onOtpChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSendInput()} placeholder="Enter OTP or input..." autoFocus style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem', background: '#0d1117', color: '#d1fae5', border: '1px solid rgba(255,255,255,0.1)' }} />
          <button className="btn btn-primary btn-sm" onClick={onSendInput}>Send</button>
        </div>
      )}
    </div>
  );
}
