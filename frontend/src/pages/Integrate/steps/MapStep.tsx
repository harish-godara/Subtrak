/* ══════════════════════════════════════════════════════
   SubTrack — MapStep (formerly FieldMapper)
   Data mapping + card builder. Uses Context.
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ArrowRight, Columns3, Link, Database } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import { FieldPicker } from '../components/FieldPicker';
import { CardPreview } from '../components/CardPreview';
import { formatValue } from '@/utils/helpers';

export function MapStep() {
  const ctx = useIntegrate();
  const [activeMapTarget, setActiveMapTarget] = useState<string | null>(null);

  if (!ctx.activeResponse || ctx.responsePaths.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <Database size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 600, marginBottom: 8 }}>No Data Available</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: 24 }}>Run your API or Playwright script first to get data for mapping.</p>
        <button className="btn btn-secondary" onClick={() => ctx.setStep('config')}>← Back to Config</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Columns3 size={18} style={{ color: 'var(--accent)' }} />
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Map API Fields to Card</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left: Field picker */}
        <FieldPicker activeMapTarget={activeMapTarget} setActiveMapTarget={setActiveMapTarget} />

        {/* Right: Response tree */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, maxHeight: 500, overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Database size={13} /> API Response ({ctx.responsePaths.length} fields)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ctx.responsePaths.map(({ path, value }) => {
              const isMapped = Object.values(ctx.fieldMapping).includes(path);
              const mappedTo = Object.entries(ctx.fieldMapping).find(([, v]) => v === path)?.[0];
              return (
                <div key={path}
                  onClick={() => { if (activeMapTarget) { ctx.setFieldMapping(prev => ({ ...prev, [activeMapTarget]: path })); setActiveMapTarget(null); } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)', cursor: activeMapTarget ? 'pointer' : 'default',
                    background: isMapped ? 'rgba(74, 222, 128, 0.05)' : 'transparent',
                    border: `1px solid ${isMapped ? 'rgba(74, 222, 128, 0.2)' : 'transparent'}`,
                    transition: 'all 0.15s ease',
                    ...(activeMapTarget ? { ':hover': { background: 'var(--accent-soft)' } } : {}),
                  }}
                  onMouseEnter={e => { if (activeMapTarget) e.currentTarget.style.background = 'var(--accent-soft)'; }}
                  onMouseLeave={e => { if (activeMapTarget) e.currentTarget.style.background = isMapped ? 'rgba(74, 222, 128, 0.05)' : 'transparent'; }}>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{path}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatValue(value)}</span>
                  {isMapped && (
                    <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Link size={8} /> {mappedTo}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Preview (bottom row) */}
      <CardPreview />

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button className="btn btn-primary" onClick={ctx.handleSave} disabled={ctx.saving}>
          {ctx.saving ? 'Saving...' : 'Save Subscription'} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
