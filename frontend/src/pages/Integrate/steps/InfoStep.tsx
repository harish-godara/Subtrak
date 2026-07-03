/* ══════════════════════════════════════════════════════
   SubTrack — InfoStep
   Subscription details form. Uses Context — zero props.
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ArrowRight, Trash2, Plus, Palette } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import { SmartSelect } from '../components/SmartSelect';
import { InvoiceForm } from '../components/InvoiceForm';
import { CURRENCIES, DEFAULT_DEPARTMENTS, DEFAULT_SERVICES, DEFAULT_BILLING_CYCLES } from '@/utils/constants';
import type { InvoiceRecord } from '@/types';

export function InfoStep() {
  const ctx = useIntegrate();
  const [peopleInput, setPeopleInput] = useState('');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const sectionStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 };

  // Merge defaults with DB-saved options
  const allDepts = [...new Set([...DEFAULT_DEPARTMENTS, ...ctx.ddOptions.departments])];
  const allServices = [...new Set([...DEFAULT_SERVICES, ...ctx.ddOptions.serviceTypes])];
  const allBilling = [...new Set([...DEFAULT_BILLING_CYCLES, ...ctx.ddOptions.billingCycles])];
  const allClients = [...new Set(ctx.ddOptions.clients)];
  const allLabels = [...new Set(ctx.ddOptions.categories)];
  const allPlatforms = [...new Set(ctx.ddOptions.platforms || [])];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Section 1: Identity */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Subscription Identity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={ctx.name} onChange={e => ctx.setName(e.target.value)} placeholder="e.g. Interakt waba" /></div>
          <div className="form-group"><label className="form-label">Account Username</label><input className="form-input" value={ctx.accountLabel} onChange={e => ctx.setAccountLabel(e.target.value)} placeholder="e.g. bob@company.com" /></div>
          <SmartSelect label="Service Type" value={ctx.serviceType} onChange={ctx.setServiceType} options={allServices} placeholder="Select service..." />
          <SmartSelect label="Platform" value={ctx.platform} onChange={ctx.setPlatform} options={allPlatforms} placeholder="Select platform" />
        </div>
      </div>

      {/* Section 2: Organization */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Organization</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SmartSelect label="Client" value={ctx.clientName} onChange={ctx.setClientName} options={allClients} placeholder="Select or add client..." />
          <SmartSelect label="Department" value={ctx.department} onChange={ctx.setDepartment} options={allDepts} placeholder="Select department..." />
          <div className="form-group"><label className="form-label">Owner / Responsible</label><input className="form-input" value={ctx.ownerName} onChange={e => ctx.setOwnerName(e.target.value)} placeholder="Person managing this" /></div>
          <div className="form-group">
            <label className="form-label">People Using</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 10px', minHeight: 38, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', alignItems: 'center' }}>
              {ctx.peopleUsing.map((p, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>
                  {p} <button onClick={() => ctx.setPeopleUsing(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1 }}>×</button>
                </span>
              ))}
              <input value={peopleInput} onChange={e => setPeopleInput(e.target.value)} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && peopleInput.trim()) { e.preventDefault(); ctx.setPeopleUsing(prev => [...prev, peopleInput.trim()]); setPeopleInput(''); } }} placeholder={ctx.peopleUsing.length === 0 ? 'Type name + Enter' : ''} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: 80, fontSize: '0.8125rem', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Billing Details */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Billing Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" value={ctx.costAmount} onChange={e => ctx.setCostAmount(e.target.value)} placeholder="0.00" /></div>
          <div className="form-group"><label className="form-label">Credits / Units</label><input className="form-input" type="number" value={ctx.creditsAmount} onChange={e => ctx.setCreditsAmount(e.target.value)} placeholder="e.g. 5000" /></div>
          <div className="form-group"><label className="form-label">Currency</label><select className="form-select" value={ctx.currency} onChange={e => ctx.setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <SmartSelect label="Billing Cycle" value={ctx.billingCycle} onChange={ctx.setBillingCycle} options={allBilling} placeholder="Select cycle..." />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Auto-Renew</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38 }}>
              <button onClick={() => ctx.setAutoRenew(!ctx.autoRenew)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: ctx.autoRenew ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: ctx.autoRenew ? 22 : 4, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{ctx.autoRenew ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={ctx.startDate} onChange={e => ctx.setStartDate(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">End Date</label><input className="form-input" type="date" value={ctx.endDate} onChange={e => ctx.setEndDate(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Renewal Date</label><input className="form-input" type="date" value={ctx.renewDate} onChange={e => ctx.setRenewDate(e.target.value)} /></div>
        </div>

        {/* Invoices & Payments */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 12px 0' }}>Invoices & Payments</h4>
          {ctx.invoices.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {ctx.invoices.map((inv, idx) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{idx + 1}</span>
                    {inv.date && <span>{inv.date}</span>}
                    {inv.paidBy && <span>by {inv.paidBy}</span>}
                    {inv.paymentRef && <span>Ref: {inv.paymentRef}</span>}
                    {inv.invoiceLink && <a href={inv.invoiceLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Invoice ↗</a>}
                  </div>
                  <button onClick={() => ctx.setInvoices(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {showInvoiceForm ? (
            <InvoiceForm onAdd={(inv: InvoiceRecord) => { ctx.setInvoices(prev => [...prev, inv]); setShowInvoiceForm(false); }} onCancel={() => setShowInvoiceForm(false)} />
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowInvoiceForm(true)}><Plus size={14} /> Add Invoice</button>
          )}
        </div>
      </div>

      {/* Section 4: Notes & Design */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Notes & Design</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <SmartSelect label="Label" value={ctx.category} onChange={ctx.setCategory} options={allLabels} placeholder="Select label..." />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Accent Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38 }}>
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-input)' }}>
                <Palette size={18} style={{ color: ctx.color }} />
                <input type="color" value={ctx.color} onChange={e => ctx.setColor(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0, margin: 0 }} />
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{ctx.color.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-input" value={ctx.notes} onChange={e => ctx.setNotes(e.target.value)} placeholder="Optional notes..." rows={2} style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-primary" onClick={() => { if (ctx.method === 'manual') ctx.handleSave(); else ctx.setStep(ctx.getNextStep()); }} disabled={ctx.saving}>
          {ctx.saving ? 'Saving...' : ctx.method === 'manual' ? 'Save' : 'Next'} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
