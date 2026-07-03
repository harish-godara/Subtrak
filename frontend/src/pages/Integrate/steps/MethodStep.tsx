/* ══════════════════════════════════════════════════════
   SubTrack — MethodStep
   Method selection cards (curl, playwright, manual).
   ══════════════════════════════════════════════════════ */

import { Globe, Bot, Edit3 } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import type { IntegrationType } from '../integrate.types';

const METHODS: { id: IntegrationType; icon: typeof Globe; title: string; desc: string }[] = [
  { id: 'manual', icon: Edit3, title: 'Manual Entry', desc: 'Fill in subscription details manually without any automation' },
  { id: 'curl', icon: Globe, title: 'API / Curl', desc: 'Paste a curl command to fetch data directly from an API' },
  { id: 'playwright', icon: Bot, title: 'Playwright Script', desc: 'Run automated browser scripts to log in and capture data' },
];

export function MethodStep() {
  const { selectMethod } = useIntegrate();

  return (
    <div style={{ maxWidth: 700, margin: '60px auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Add New Subscription</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 40 }}>Choose how you'd like to track this subscription</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {METHODS.map(opt => (
          <button key={opt.id} onClick={() => selectMethod(opt.id)}
            style={{ background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, cursor: 'pointer', textAlign: 'center', transition: 'all var(--transition-fast)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <opt.icon size={24} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{opt.title}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
