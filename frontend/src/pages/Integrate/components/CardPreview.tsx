/* ══════════════════════════════════════════════════════
   SubTrack — CardPreview (bottom of MapStep)
   Uses IntegrateContext for card state.
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Edit3, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { resolvePath, formatCurrency } from '@/utils/helpers';
import { useIntegrate } from '../IntegrateContext';

export function CardPreview() {
  const {
    cardBlocks, setCardBlocks, fieldMapping, activeResponse, customFields,
    name, accountLabel, category, currency, color, setStep,
  } = useIntegrate();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 28 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Dashboard Card Preview</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '4px 0 0' }}>Live preview — values update as you map. Click metric labels to rename them.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 28, alignItems: 'start' }}>
        {/* The Card */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24, boxShadow: 'var(--shadow-md)', borderTop: `4px solid ${color || 'var(--accent)'}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, background: color || 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.125rem', flexShrink: 0 }}>{name ? name.charAt(0).toUpperCase() : '?'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{name || 'New Subscription'}</div>
                {accountLabel && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{accountLabel}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{category || 'Uncategorized'}</div>
              </div>
            </div>
            <span className="badge badge-active">active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {cardBlocks.map((block, index) => {
              let previewValue = '';
              let path = '';
              if (block.type === 'balance') path = fieldMapping['balance'];
              else if (block.type === 'cost') path = fieldMapping['cost'];
              else if (block.type === 'custom' && block.fieldKey) path = fieldMapping[block.fieldKey];
              if (block.type === 'dates') {
                const start = fieldMapping['startDate'] ? resolvePath(fieldMapping['startDate'], activeResponse) : null;
                const end = fieldMapping['endDate'] ? resolvePath(fieldMapping['endDate'], activeResponse) : null;
                previewValue = (start || 'Now') + ' → ' + (end || 'Future');
              } else if (path) {
                const val = resolvePath(path, activeResponse);
                if (val != null) {
                  if (block.type === 'balance') previewValue = formatCurrency(Number(val), currency || 'INR');
                  else if (block.type === 'cost') previewValue = formatCurrency(Number(val), currency || 'INR') + ' / cycle';
                  else previewValue = String(val);
                } else previewValue = '—';
              } else {
                if (block.type === 'balance') previewValue = formatCurrency(0, currency || 'INR');
                else if (block.type === 'cost') previewValue = formatCurrency(0, currency || 'INR') + ' / month';
                else previewValue = '(unmapped)';
              }
              return (
                <div key={block.id} style={{ position: 'relative', padding: '10px 12px', margin: '-4px -12px', borderRadius: 'var(--radius-md)', border: '1px dashed transparent', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.border = '1px dashed var(--border-strong)'}
                  onMouseLeave={e => e.currentTarget.style.border = '1px dashed transparent'}>
                  <div style={{ position: 'absolute', right: 6, top: 8, gap: 2, display: 'flex' }}>
                    <button onClick={() => { if (index > 0) setCardBlocks(prev => { const n = [...prev]; [n[index - 1], n[index]] = [n[index], n[index - 1]]; return n; }); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}><ChevronUp size={13} /></button>
                    <button onClick={() => { if (index < cardBlocks.length - 1) setCardBlocks(prev => { const n = [...prev]; [n[index + 1], n[index]] = [n[index], n[index + 1]]; return n; }); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}><ChevronDown size={13} /></button>
                    <button onClick={() => setCardBlocks(prev => prev.filter(b => b.id !== block.id))} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2, marginLeft: 2 }}><Trash2 size={11} /></button>
                  </div>
                  <div style={{ paddingRight: 60 }}>
                    {editingBlockId === block.id ? (
                      <input autoFocus className="form-input" style={{ fontSize: '0.6875rem', fontWeight: 600, padding: 4, height: 22, marginBottom: 4 }} value={block.label}
                        onChange={e => setCardBlocks(prev => prev.map(b => b.id === block.id ? { ...b, label: e.target.value } : b))}
                        onBlur={() => setEditingBlockId(null)} onKeyDown={e => e.key === 'Enter' && setEditingBlockId(null)} />
                    ) : (
                      <div onClick={() => setEditingBlockId(block.id)} title="Click to rename" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, cursor: 'text', display: 'flex', alignItems: 'center', gap: 4 }}>{block.label} <Edit3 size={9} style={{ opacity: 0.4 }} /></div>
                    )}
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: (!path && block.type !== 'dates' && block.type !== 'balance') ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{previewValue}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <select className="form-select" style={{ fontSize: '0.75rem', width: '100%', padding: '6px 12px' }}
              onChange={e => { const val = e.target.value; if (!val) return;
                if (val === 'balance') setCardBlocks(prev => [...prev, { id: 'b_' + Date.now(), type: 'balance', label: 'Balance' }]);
                else if (val === 'cost') setCardBlocks(prev => [...prev, { id: 'b_' + Date.now(), type: 'cost', label: 'Cost' }]);
                else if (val === 'dates') setCardBlocks(prev => [...prev, { id: 'b_' + Date.now(), type: 'dates', label: 'Dates' }]);
                else setCardBlocks(prev => [...prev, { id: 'b_' + Date.now(), type: 'custom', fieldKey: val, label: val }]);
                e.target.value = ''; }}>
              <option value="">+ Add Metric to Card</option>
              <optgroup label="Core Fields">
                {!cardBlocks.some(b => b.type === 'balance') && <option value="balance">{'Balance' + (fieldMapping['balance'] ? ' ✓' : '')}</option>}
                {!cardBlocks.some(b => b.type === 'cost') && <option value="cost">Cost</option>}
                {!cardBlocks.some(b => b.type === 'dates') && <option value="dates">{'Dates (Start→End)' + ((fieldMapping['startDate'] || fieldMapping['endDate']) ? ' ✓' : '')}</option>}
                {!cardBlocks.some(b => b.fieldKey === 'parkedBalance') && <option value="parkedBalance">{'Parked Balance' + (fieldMapping['parkedBalance'] ? ' ✓' : '')}</option>}
                {!cardBlocks.some(b => b.fieldKey === 'totalBalance') && <option value="totalBalance">{'Total Balance' + (fieldMapping['totalBalance'] ? ' ✓' : '')}</option>}
                {!cardBlocks.some(b => b.fieldKey === 'currency') && <option value="currency">{'Currency' + (fieldMapping['currency'] ? ' ✓' : '')}</option>}
              </optgroup>
              {customFields.length > 0 && (
                <optgroup label="Custom Fields">
                  {customFields.filter(cf => !cardBlocks.some(b => b.fieldKey === cf)).map(cf => <option key={cf} value={cf}>{cf + (fieldMapping[cf] ? ' ✓' : '')}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>
        {/* Card details are edited on the Subscription Details page */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Edit3 size={13} /> Card Details</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>Name, account, category, currency and billing cycle are edited on the Subscription Details page.</p>
          <button className="btn btn-secondary" onClick={() => setStep('info')}><Edit3 size={14} /> Edit Card Details</button>
        </div>
      </div>
    </div>
  );
}
