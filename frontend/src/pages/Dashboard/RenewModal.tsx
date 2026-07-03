/* ══════════════════════════════════════════════════════
   SubTrack — Renew / Update / Upgrade Modal
   Renew a subscription: new plan, pricing, term + optional invoice.
   ══════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { RotateCw, Receipt } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { CURRENCIES, DEFAULT_BILLING_CYCLES } from '@/utils/constants';
import { computeNextRenewal, toDateInputValue } from '@/utils/helpers';
import type { RenewSubscriptionPayload } from '@/api/client';
import type { Subscription } from '@/types';

interface RenewModalProps {
  subscription: Subscription;
  renewing: boolean;
  onClose: () => void;
  onRenew: (payload: RenewSubscriptionPayload) => void;
}

export function RenewModal({ subscription: sub, renewing, onClose, onRenew }: RenewModalProps) {
  // Plan & pricing — pre-filled from the subscription's current values.
  const [planName, setPlanName] = useState(sub.planName || '');
  const [billingCycle, setBillingCycle] = useState(sub.billingCycle || 'one-time');
  const [currency, setCurrency] = useState(sub.currency || 'INR');
  const [amount, setAmount] = useState(sub.cost?.amount != null ? String(sub.cost.amount) : '');

  // Term — start defaults to the current next-renewal date; end auto-computed.
  const defaultStart = toDateInputValue(sub.dates?.nextRenewal || sub.dates?.endDate) || toDateInputValue(new Date().toISOString());
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(computeNextRenewal(defaultStart, sub.billingCycle));

  // Invoice (optional).
  const [addInvoice, setAddInvoice] = useState(true);
  const [invAmount, setInvAmount] = useState(sub.cost?.amount != null ? String(sub.cost.amount) : '');
  const [invCredits, setInvCredits] = useState('');
  const [invPaidBy, setInvPaidBy] = useState('');
  const [invRef, setInvRef] = useState('');
  const [invLink, setInvLink] = useState('');
  const [invDate, setInvDate] = useState(defaultStart);

  const [notes, setNotes] = useState('');

  const billingCycleOptions = useMemo(() => {
    const set = new Set(DEFAULT_BILLING_CYCLES);
    if (sub.billingCycle) set.add(sub.billingCycle);
    if (billingCycle) set.add(billingCycle);
    return Array.from(set);
  }, [sub.billingCycle, billingCycle]);

  // Re-derive the next-renewal date when the start or cycle changes.
  const recomputeEnd = (start: string, cycle: string) => {
    const next = computeNextRenewal(start, cycle);
    if (next) setPeriodEnd(next);
  };

  const planChanged = (planName || '') !== (sub.planName || '') || billingCycle !== sub.billingCycle;
  const priceChanged = amount.trim() !== '' && Number(amount) !== (sub.cost?.amount ?? NaN);
  const canSubmit = !renewing && (!!periodEnd || amount.trim() !== '' || planChanged || priceChanged);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const price = amount.trim() !== '' ? Number(amount) : undefined;
    const payload: RenewSubscriptionPayload = {
      planName: planName.trim() || undefined,
      billingCycle: billingCycle || undefined,
      currency: currency || undefined,
      amount: price,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
      notes: notes.trim() || undefined,
      invoice: addInvoice
        ? {
            amount: invAmount.trim() !== '' ? Number(invAmount) : price,
            credits: invCredits.trim() !== '' ? Number(invCredits) : undefined,
            planName: planName.trim() || undefined,
            currency: currency || undefined,
            paidBy: invPaidBy.trim() || undefined,
            paymentRef: invRef.trim() || undefined,
            invoiceLink: invLink.trim() || undefined,
            date: invDate || undefined,
          }
        : null,
    };
    onRenew(payload);
  };

  const fg = { flex: '1 1 calc(50% - 8px)', minWidth: 150 } as const;
  const sectionTitle = {
    fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10,
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Renew — ${sub.name}`}
      maxWidth="620px"
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={renewing}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!canSubmit}>
            <RotateCw size={14} className={renewing ? 'spinning' : ''} />
            {renewing ? 'Saving...' : 'Renew Subscription'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Plan & pricing */}
        <div>
          <div style={sectionTitle}>Plan &amp; Pricing</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div className="form-group" style={fg}>
              <label className="form-label">Plan Name</label>
              <input className="form-input" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Pro, Growth" />
            </div>
            <div className="form-group" style={fg}>
              <label className="form-label">Billing Cycle</label>
              <select
                className="form-select"
                value={billingCycle}
                onChange={e => { setBillingCycle(e.target.value); recomputeEnd(periodStart, e.target.value); }}
              >
                {billingCycleOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={fg}>
              <label className="form-label">Currency</label>
              <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </div>
            <div className="form-group" style={fg}>
              <label className="form-label">Amount (per term)</label>
              <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Term */}
        <div>
          <div style={sectionTitle}>Term</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div className="form-group" style={fg}>
              <label className="form-label">New Term Start</label>
              <input
                className="form-input"
                type="date"
                value={periodStart}
                onChange={e => { setPeriodStart(e.target.value); recomputeEnd(e.target.value, billingCycle); }}
              />
            </div>
            <div className="form-group" style={fg}>
              <label className="form-label">Next Renewal</label>
              <input className="form-input" type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Next renewal is auto-filled from the billing cycle — adjust it if needed.
          </p>
        </div>

        {/* Invoice */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: addInvoice ? 12 : 0 }}>
            <input type="checkbox" checked={addInvoice} onChange={e => setAddInvoice(e.target.checked)} />
            <span style={{ ...sectionTitle, marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={13} /> Add invoice for this renewal
            </span>
          </label>
          {addInvoice && (
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <div className="form-group" style={fg}>
                  <label className="form-label">Invoice Amount</label>
                  <input className="form-input" type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="Defaults to plan amount" />
                </div>
                <div className="form-group" style={fg}>
                  <label className="form-label">Credits Added</label>
                  <input className="form-input" type="number" value={invCredits} onChange={e => setInvCredits(e.target.value)} placeholder="Optional" />
                </div>
                <div className="form-group" style={fg}>
                  <label className="form-label">Paid By</label>
                  <input className="form-input" value={invPaidBy} onChange={e => setInvPaidBy(e.target.value)} placeholder="Who paid" />
                </div>
                <div className="form-group" style={fg}>
                  <label className="form-label">Payment Ref #</label>
                  <input className="form-input" value={invRef} onChange={e => setInvRef(e.target.value)} placeholder="TXN_ABC123" />
                </div>
                <div className="form-group" style={fg}>
                  <label className="form-label">Payment Date</label>
                  <input className="form-input" type="date" value={invDate} onChange={e => setInvDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ ...fg, flex: '1 1 100%' }}>
                  <label className="form-label">Invoice Link</label>
                  <input className="form-input" value={invLink} onChange={e => setInvLink(e.target.value)} placeholder="https://drive.google.com/..." />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Notes</label>
          <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes about this change" />
        </div>
      </div>
    </Modal>
  );
}
