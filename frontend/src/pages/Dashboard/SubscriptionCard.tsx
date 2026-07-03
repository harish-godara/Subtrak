/* ══════════════════════════════════════════════════════
   SubTrack — Subscription Card (Grid + List Row)
   ══════════════════════════════════════════════════════ */

import { Plus, RefreshCw, MoreVertical, Clock, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate, daysUntil, timeAgo, getStatusFromDates } from '@/utils/helpers';
import type { Subscription } from '@/types';
import type { SubscriptionCardProps } from './types';

/* ── Shared Sub-Components ─────────────────────── */

function SubAvatar({ name, logo }: { name: string; logo?: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div style={{
      width: 52, height: 52,
      background: 'var(--accent-soft)',
      borderRadius: '14px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      {logo ? (
        <img src={logo} alt={name} style={{ width: 28, height: 28, objectFit: 'contain' }} />
      ) : (
        <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.25rem' }}>
          {initial}
        </div>
      )}
    </div>
  );
}

// Show the expiry/renewal chip only within this many days of the renewal date.
const EXPIRY_WINDOW_DAYS = 15;

const chipBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: '0.6875rem',
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
} as const;

/** Soft "expires/renews in Nd" pill — only renders within EXPIRY_WINDOW_DAYS. */
function ExpiryChip({ sub, compact = false }: { sub: Subscription; compact?: boolean }) {
  const renewalDate = sub.dates?.nextRenewal || sub.dates?.endDate;
  const dLeft = daysUntil(renewalDate);
  if (dLeft === null || dLeft < 0 || dLeft > EXPIRY_WINDOW_DAYS) return null;

  const renewing = !!sub.autoRenew;
  const urgent = dLeft <= 3;

  const bg = renewing
    ? 'rgba(245, 158, 11, 0.16)'
    : urgent ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)';
  const color = renewing ? '#F59E0B' : '#EF4444';

  const full = renewing
    ? `Renews in ${dLeft}d`
    : dLeft === 0 ? 'Expires today' : `Expires in ${dLeft}d`;
  // Compact (list view, narrow column) — the Term Dates column already spells it out.
  const label = compact ? (dLeft === 0 ? 'Today' : `${dLeft}d`) : full;

  const Icon = renewing ? RefreshCw : Clock;

  return (
    <span style={{ ...chipBase, background: bg, color }} title={full}>
      <Icon size={12} strokeWidth={2.5} /> {label}
    </span>
  );
}

/** Soft OTP-required pill. */
function OtpChip() {
  return (
    <span style={{ ...chipBase, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }} title="This subscription needs an OTP to refresh">
      <ShieldAlert size={12} strokeWidth={2.5} /> OTP
    </span>
  );
}

/** Status badge + OTP/expiry chips, stacked and aligned. */
function CardChips({ sub, status, align, compact = false }: { sub: Subscription; status: string; align: 'flex-end' | 'flex-start'; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 6, flexShrink: 0, minWidth: 0 }}>
      <span className={`badge badge-${status}`} style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>{status}</span>
      {(sub.otpRequired || sub.dates?.nextRenewal || sub.dates?.endDate) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: align }}>
          {sub.otpRequired && <OtpChip />}
          <ExpiryChip sub={sub} compact={compact} />
        </div>
      )}
    </div>
  );
}

/* ── Grid Card ──────────────────────────────────── */

function GridCard({ sub, index, onSelect, refreshing }: SubscriptionCardProps) {
  const status = getStatusFromDates(sub);
  const balance = sub.credits?.balance;
  const currency = (sub.currency || 'INR').toUpperCase();

  return (
    <div
      key={sub.id}
      onClick={() => onSelect(sub)}
      style={{
        background: 'var(--bg-card)',
        border: 'none',
        borderRadius: '16px',
        padding: 24,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        position: 'relative',
        animation: `slideUp 0.3s ease ${index * 0.05}s both`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SubAvatar name={sub.name} logo={sub.logo || undefined} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</div>
            {sub.account_label && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                {sub.account_label}
              </div>
            )}
            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {sub.category || 'Uncategorized'}
            </div>
          </div>
        </div>
        <CardChips sub={sub} status={status} align="flex-end" />
      </div>

      {/* Dynamic Body Blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(() => {
          const blocks: any[] = (sub.customData?._cardConfig as any)?.blocks;
          const renderBlocks = blocks && blocks.length > 0 ? blocks : [
            { id: 'b_balance', type: 'balance', label: balance != null ? 'Credit Balance' : 'Cost' },
            { id: 'b_dates', type: 'dates', label: 'Dates' }
          ];

          return renderBlocks.map((block: any) => {
            if (block.type === 'balance' || block.type === 'cost') {
              return (
                <div key={block.id}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {block.label}
                  </div>
                  <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {block.type === 'balance' && balance != null
                      ? formatCurrency(balance, currency)
                      : sub.cost?.amount
                        ? `${formatCurrency(sub.cost.amount, currency)} / ${sub.cost.cycle || 'month'}`
                        : '—'}
                  </div>
                </div>
              );
            }
            if (block.type === 'dates') {
              return (
                <div key={block.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', opacity: 0.7 }}>Start</span>
                    <span>{formatDate(sub.dates?.startDate)}</span>
                  </div>
                  <span style={{ color: 'var(--border-strong)' }}>→</span>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', opacity: 0.7 }}>End</span>
                    <span>{formatDate(sub.dates?.endDate)}</span>
                  </div>
                  {sub.dates?.lastRefreshed && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={12} />
                      <span>{timeAgo(sub.dates.lastRefreshed)}</span>
                    </div>
                  )}
                </div>
              );
            }
            if (block.type === 'custom') {
              const raw = sub.customData as Record<string, unknown> | null;
              const val = raw ? raw[block.fieldKey] : null;
              return (
                <div key={block.id}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {block.label}
                  </div>
                  <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {val != null ? String(val) : '—'}
                  </div>
                </div>
              );
            }
            return null;
          });
        })()}
      </div>

    </div>
  );
}

/* ── List Row ───────────────────────────────────── */

function ListRow({ sub, index, onSelect }: SubscriptionCardProps) {
  const status = getStatusFromDates(sub);
  const balance = sub.credits?.balance;
  const currency = (sub.currency || 'INR').toUpperCase();
  const renewalDate = sub.dates?.nextRenewal || sub.dates?.endDate;
  const dLeft = daysUntil(renewalDate);

  // Credits/Usage
  let usageString = 'Unlimited';
  let usageSub = 'N/A';
  const blocks = (sub.customData?._cardConfig as any)?.blocks || [];
  const customBlock = blocks.find((b: any) => b.type === 'custom' || b.type === 'balance');

  if (balance != null) {
    usageString = `${balance} units`;
    usageSub = 'Credits';
  } else if (customBlock) {
    const raw = sub.customData as Record<string, unknown>;
    const val = raw ? raw[customBlock.fieldKey] : null;
    if (val != null) {
      usageString = String(val);
      usageSub = customBlock.label || '';
    }
  } else {
    if (sub.cost?.amount && !sub.dates?.startDate) {
      usageString = 'Unlimited';
      usageSub = 'Usage';
    }
  }

  return (
    <div
      key={sub.id}
      onClick={() => onSelect(sub)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(250px, 2fr) minmax(150px, 1.5fr) minmax(200px, 1.5fr) minmax(200px, 2fr) 100px 40px',
        gap: 16,
        alignItems: 'center',
        background: 'var(--bg-card)',
        border: 'none',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        animation: `slideUp 0.3s ease ${index * 0.05}s both`,
        position: 'relative'
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      {/* 1. Service */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden' }}>
        <SubAvatar name={sub.name} logo={sub.logo || undefined} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.category || 'Uncategorized'}</div>
        </div>
      </div>

      {/* 2. Plan Details */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {sub.cost?.amount ? formatCurrency(sub.cost.amount, currency) : '—'}
          {sub.cost?.amount ? <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/{sub.cost.cycle === 'yearly' ? 'yr' : 'mo'}</span> : ''}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
          {sub.planName || (sub.cost?.cycle ? sub.cost.cycle.charAt(0).toUpperCase() + sub.cost.cycle.slice(1) : 'Monthly')}
        </div>
      </div>

      {/* 3. Credits/Usage */}
      <div style={{ minWidth: 0, paddingRight: 32 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usageString}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usageSub}</div>
      </div>

      {/* 4. Term Dates */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub.dates?.startDate ? formatDate(sub.dates.startDate) : '—'} - {sub.dates?.endDate || sub.dates?.nextRenewal ? formatDate(sub.dates.endDate || sub.dates.nextRenewal) : '—'}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
          {dLeft !== null ? (sub.autoRenew ? `Renews in ${dLeft} days` : `Expires in ${dLeft} days`) : '—'}
        </div>
      </div>

      {/* 5. Status */}
      <CardChips sub={sub} status={status} align="flex-start" compact />

      {/* 6. Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(sub); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}
        >
          <MoreVertical size={24} />
        </button>
      </div>
      
    </div>
  );
}

/* ── Add New Card/Row ───────────────────────────── */

function AddNewCard({ viewMode, onNavigate }: { viewMode: 'grid' | 'list'; onNavigate: () => void }) {
  if (viewMode === 'list') {
    return (
      <div
        onClick={onNavigate}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'transparent', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 20, cursor: 'pointer',
          color: 'var(--text-tertiary)', transition: 'all var(--transition-fast)', marginTop: 8
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
        }}
      >
        <Plus size={20} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Add New</span>
      </div>
    );
  }

  return (
    <div
      onClick={onNavigate}
      style={{
        background: 'var(--bg-card)', border: '2px dashed var(--border)',
        borderRadius: '16px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', minHeight: 200,
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
        (e.currentTarget.querySelector('.add-btn') as HTMLElement)?.style.setProperty('transform', 'scale(1.1)');
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget.querySelector('.add-btn') as HTMLElement)?.style.setProperty('transform', 'scale(1)');
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="add-btn" style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', border: '2px solid var(--accent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--transition-fast)'
        }}>
          <Plus size={24} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add New</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Track a new subscription</span>
        </div>
      </div>
    </div>
  );
}

/* ── Exported Composite ─────────────────────────── */

export function SubscriptionCard(props: SubscriptionCardProps) {
  return props.viewMode === 'grid' ? <GridCard {...props} /> : <ListRow {...props} />;
}

export { AddNewCard };
