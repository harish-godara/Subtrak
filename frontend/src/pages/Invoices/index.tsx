/* ══════════════════════════════════════════════════════
   SubTrack — Invoices Page (React + TypeScript)
   All invoices across every subscription (active or inactive),
   grouped by client / department / service type.
   ══════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Users, Building2, Layers,
  Tag, Calendar, Coins, CreditCard, User, Hash, ExternalLink,
} from 'lucide-react';
import { apiGetSubscriptions } from '@/api/client';
import { formatCurrency, formatDate, getStatusFromDates } from '@/utils/helpers';
import type { Subscription } from '@/types';

type GroupKey = 'client' | 'department' | 'serviceType';

interface FlatInvoice {
  id: string;
  subId: string;
  subName: string;
  subColor: string;
  status: string;
  currency: string;
  client: string;
  department: string;
  serviceType: string;
  amount?: number;
  credits?: number;
  planName?: string;
  paymentMethod?: string;
  paidBy?: string;
  paymentRef?: string;
  date?: string;
  invoiceLink?: string;
}

const UNASSIGNED = 'Unassigned';

const GROUP_OPTIONS: { key: GroupKey; label: string; icon: typeof Users }[] = [
  { key: 'client', label: 'Client', icon: Users },
  { key: 'department', label: 'Department', icon: Building2 },
  { key: 'serviceType', label: 'Service Type', icon: Layers },
];

function statusBadge(status: string): { bg: string; color: string } {
  if (status === 'active') return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981' };
  if (status === 'expired' || status === 'cancelled') return { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' };
  return { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)' };
}

export function InvoicesPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupKey>(
    () => (localStorage.getItem('subtrack_invoice_group') as GroupKey) || 'client'
  );

  useEffect(() => {
    apiGetSubscriptions()
      .then(data => setSubs(data))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('subtrack_invoice_group', groupBy);
  }, [groupBy]);

  // Flatten every invoice and attach its parent subscription's context.
  const allInvoices = useMemo<FlatInvoice[]>(() => {
    const rows: FlatInvoice[] = [];
    for (const sub of subs) {
      const invoices = sub.invoices || [];
      invoices.forEach((inv, idx) => {
        rows.push({
          id: inv.id || `${sub.id}-${idx}`,
          subId: sub.id,
          subName: sub.name,
          subColor: sub.color || '#6366F1',
          status: getStatusFromDates(sub),
          currency: sub.currency || 'INR',
          client: sub.client?.trim() || UNASSIGNED,
          department: sub.department?.trim() || UNASSIGNED,
          serviceType: sub.serviceType?.trim() || UNASSIGNED,
          amount: inv.amount,
          credits: inv.credits,
          planName: inv.planName,
          paymentMethod: inv.paymentMethod,
          paidBy: inv.paidBy,
          paymentRef: inv.paymentRef,
          date: inv.date,
          invoiceLink: inv.invoiceLink,
        });
      });
    }
    return rows;
  }, [subs]);

  const grandTotal = useMemo(
    () => allInvoices.reduce((s, i) => s + (i.amount || 0), 0),
    [allInvoices]
  );

  // Group, sort groups alphabetically (Unassigned last), invoices newest-first.
  const groups = useMemo(() => {
    const map = new Map<string, FlatInvoice[]>();
    for (const row of allInvoices) {
      const key = row[groupBy] || UNASSIGNED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        if (a[0] === UNASSIGNED) return 1;
        if (b[0] === UNASSIGNED) return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([name, items]) => ({
        name,
        items: items.slice().sort((x, y) => {
          const dx = x.date ? new Date(x.date).getTime() : 0;
          const dy = y.date ? new Date(y.date).getTime() : 0;
          return dy - dx;
        }),
        total: items.reduce((s, i) => s + (i.amount || 0), 0),
        currency: items[0]?.currency || 'INR',
      }));
  }, [allInvoices, groupBy]);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Receipt size={24} /> Invoices
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {allInvoices.length} {allInvoices.length === 1 ? 'invoice' : 'invoices'} · {formatCurrency(grandTotal, 'INR')} billed across {subs.length} subscriptions
          </p>
        </div>

        {/* Group-by toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group by</span>
          <div style={{ display: 'inline-flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 4, gap: 4 }}>
            {GROUP_OPTIONS.map(opt => {
              const active = groupBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setGroupBy(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--bg-card)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <opt.icon size={15} /> {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>Loading invoices…</div>
      ) : allInvoices.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '80px 0', background: 'var(--bg-input)', borderRadius: 24, color: 'var(--text-tertiary)',
        }}>
          <Receipt size={40} strokeWidth={1.5} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No invoices yet</div>
          <div style={{ fontSize: '0.875rem' }}>Invoices added to your subscriptions will appear here.</div>
        </div>
      ) : (
        groups.map(group => (
          <section key={group.name} style={{ marginBottom: 36 }}>
            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {group.name}
              </h2>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)', borderRadius: 999, padding: '3px 10px',
              }}>
                {group.items.length} {group.items.length === 1 ? 'invoice' : 'invoices'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(group.total, group.currency)}
              </span>
            </div>

            {/* Invoice grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {group.items.map(inv => (
                <InvoiceCard key={inv.id} inv={inv} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function InvoiceCard({ inv }: { inv: FlatInvoice }) {
  const badge = statusBadge(inv.status);
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
    }}>
      {/* Subscription + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: inv.subColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {inv.subName}
        </span>
        <span style={{
          marginLeft: 'auto', flexShrink: 0, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'capitalize',
          padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color,
        }}>
          {inv.status}
        </span>
      </div>

      {/* Amount */}
      <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
        {inv.amount != null ? formatCurrency(inv.amount, inv.currency) : '—'}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {inv.planName && <Meta icon={Tag} text={inv.planName} />}
        {inv.date && <Meta icon={Calendar} text={formatDate(inv.date)} />}
        {inv.credits != null && <Meta icon={Coins} text={`${inv.credits} credits`} />}
        {inv.paymentMethod && <Meta icon={CreditCard} text={inv.paymentMethod} />}
        {inv.paidBy && <Meta icon={User} text={`Paid by ${inv.paidBy}`} />}
        {inv.paymentRef && <Meta icon={Hash} text={inv.paymentRef} />}
      </div>

      {/* Link */}
      {inv.invoiceLink && (
        <a
          href={inv.invoiceLink}
          target="_blank"
          rel="noreferrer"
          style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> View invoice
        </a>
      )}
    </div>
  );
}

function Meta({ icon: Icon, text }: { icon: typeof Tag; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)', minWidth: 0 }}>
      <Icon size={14} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
}
