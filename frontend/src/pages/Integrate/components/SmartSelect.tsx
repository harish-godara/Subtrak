/* ══════════════════════════════════════════════════════
   SubTrack — SmartSelect
   Generic "dropdown + add custom value" component.
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';

interface SmartSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

export function SmartSelect({ label, value, onChange, options, placeholder = 'Select...' }: SmartSelectProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {!showCustom ? (
        <select className="form-select"
          style={!value ? { color: 'var(--text-tertiary)' } : { color: 'var(--text-primary)' }}
          value={value}
          onChange={e => { if (e.target.value === '__custom__') { setShowCustom(true); } else { onChange(e.target.value); } }}>
          <option value="" style={{ color: 'var(--text-tertiary)' }}>{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          {value && !options.includes(value) && <option key={value} value={value}>{value}</option>}
          <option value="__custom__">+ Add Custom</option>
        </select>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="form-input" value={customVal} onChange={e => setCustomVal(e.target.value)} placeholder="Type custom value..." autoFocus style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={() => { if (customVal.trim()) { onChange(customVal.trim()); setShowCustom(false); setCustomVal(''); } }}>Add</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowCustom(false); setCustomVal(''); }}>✕</button>
        </div>
      )}
    </div>
  );
}
