/* ══════════════════════════════════════════════════════
   SubTrack — FieldPicker (left panel of MapStep)
   Uses IntegrateContext for field mapping state.
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Database, Edit3, Layers, Link, MousePointer2, X, Trash2, Plus, FileCode } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';

interface FieldPickerProps {
  activeMapTarget: string | null;
  setActiveMapTarget: (v: string | null) => void;
}

export function FieldPicker({ activeMapTarget, setActiveMapTarget }: FieldPickerProps) {
  const { fieldMapping, setFieldMapping, customFields, setCustomFields } = useIntegrate();
  const [newCustomFieldInput, setNewCustomFieldInput] = useState('');

  const coreFields = [
    { id: 'balance', label: 'Balance' },
    { id: 'parkedBalance', label: 'Parked Balance' },
    { id: 'totalBalance', label: 'Total Balance' },
    { id: 'currency', label: 'Currency' },
    { id: 'startDate', label: 'Start Date' },
    { id: 'endDate', label: 'End Date' },
  ];

  const renderField = (fieldId: string, label: string, icon: React.ReactNode, showDelete?: boolean) => {
    const mappedPath = fieldMapping[fieldId];
    const isActive = activeMapTarget === fieldId;
    return (
      <div key={fieldId} onClick={() => setActiveMapTarget(isActive ? null : fieldId)}
        style={{
          display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          background: isActive ? 'var(--accent-soft)' : mappedPath ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-primary)',
          border: `1px solid ${isActive ? 'var(--accent)' : mappedPath ? 'rgba(74, 222, 128, 0.3)' : 'var(--border)'}`,
          transition: 'all 0.2s ease',
          boxShadow: isActive ? '0 0 0 2px rgba(99, 102, 241, 0.1)' : 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {mappedPath && (
              <button onClick={e => { e.stopPropagation(); setFieldMapping(prev => { const nm = { ...prev }; delete nm[fieldId]; return nm; }); setActiveMapTarget(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <X size={12} />
              </button>
            )}
            {showDelete && (
              <button onClick={e => { e.stopPropagation(); setCustomFields(prev => prev.filter(c => c !== fieldId)); setFieldMapping(prev => { const nm = { ...prev }; delete nm[fieldId]; return nm; }); if (activeMapTarget === fieldId) setActiveMapTarget(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0.7 }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        {mappedPath && <div style={{ fontSize: '0.6875rem', color: '#4ade80', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}><Link size={10} /> {mappedPath}</div>}
        {isActive && !mappedPath && <div style={{ fontSize: '0.6875rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><MousePointer2 size={10} /> Select a value on the right...</div>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Database size={13} /> Core Fields</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {coreFields.map(f => renderField(f.id, f.label, <Layers size={13} style={{ opacity: 0.5 }} />))}
        </div>
      </div>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Edit3 size={13} /> Custom Fields</h3>
        {customFields.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {customFields.map(cfId => renderField(cfId, cfId, <FileCode size={13} style={{ opacity: 0.5 }} />, true))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="form-input" value={newCustomFieldInput} onChange={e => setNewCustomFieldInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCustomFieldInput.trim()) { setCustomFields(prev => Array.from(new Set([...prev, newCustomFieldInput.trim()]))); setNewCustomFieldInput(''); } }}
            placeholder="E.g. Credits Remaining" style={{ fontSize: '0.8125rem', height: 32 }} />
          <button className="btn btn-secondary btn-sm" onClick={() => { if (newCustomFieldInput.trim()) { setCustomFields(prev => Array.from(new Set([...prev, newCustomFieldInput.trim()]))); setNewCustomFieldInput(''); } }} style={{ padding: '0 12px' }}><Plus size={14} /></button>
        </div>
      </div>
    </div>
  );
}
