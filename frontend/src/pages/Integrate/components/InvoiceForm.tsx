/* ══════════════════════════════════════════════════════
   SubTrack — InvoiceForm
   Inline invoice entry form extracted from InfoStep.
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { InvoiceRecord } from '@/types';

interface InvoiceFormProps {
  onAdd: (inv: InvoiceRecord) => void;
  onCancel: () => void;
}

export function InvoiceForm({ onAdd, onCancel }: InvoiceFormProps) {
  const [link, setLink] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = () => {
    onAdd({
      id: `inv_${Date.now()}`,
      invoiceLink: link || undefined,
      paidBy: paidBy || undefined,
      paymentRef: ref || undefined,
      date: date || undefined,
    });
  };

  const fgStyle = { flex: '1 1 calc(50% - 8px)', minWidth: 140 } as const;

  return (
    <div style={{ padding: 16, border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div className="form-group" style={{ ...fgStyle, flex: '1 1 100%' }}><label className="form-label">Invoice Link</label><input className="form-input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://drive.google.com/..." /></div>
        <div className="form-group" style={fgStyle}><label className="form-label">Paid By</label><input className="form-input" value={paidBy} onChange={e => setPaidBy(e.target.value)} placeholder="Who paid" /></div>
        <div className="form-group" style={fgStyle}><label className="form-label">Payment Ref #</label><input className="form-input" value={ref} onChange={e => setRef(e.target.value)} placeholder="TXN_ABC123" /></div>
        <div className="form-group" style={fgStyle}><label className="form-label">Payment Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit}><Plus size={14} /> Add Invoice Record</button>
      </div>
    </div>
  );
}
