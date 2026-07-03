/* ══════════════════════════════════════════════════════
   SubTrack — Analytics Page (React + TypeScript)
   ══════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, IndianRupee, CalendarClock, Activity, Clock,
  PieChart, TrendingUp, Layers,
} from 'lucide-react';
import { apiGetSubscriptions } from '@/api/client';
import { formatCurrency, getStatusFromDates, daysUntil, formatDate } from '@/utils/helpers';
import type { Subscription } from '@/types';

/* Stable category palette — shared by the donut, its legend, and the bars
   so every chart is color-consistent. */
const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'];

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  expired: '#EF4444',
  cancelled: '#6B7280',
  paused: '#F59E0B',
  trial: '#06B6D4',
};
const statusColor = (s: string) => STATUS_COLORS[s] || '#8B5CF6';

/* Normalise any billing cycle to a monthly figure. */
function monthlyCost(s: Subscription): number {
  const amt = s.cost?.amount || 0;
  const cycle = (s.cost?.cycle || s.billingCycle || '').toLowerCase();
  return cycle === 'yearly' || cycle === 'annual' || cycle === 'year' ? amt / 12 : amt;
}

/* Dimensions the "Spending by …" donut can be grouped by. */
const SPEND_DIMENSIONS = [
  { key: 'category', label: 'Category', get: (s: Subscription) => s.category, empty: 'Other' },
  { key: 'client', label: 'Client', get: (s: Subscription) => s.client, empty: 'Unassigned' },
  { key: 'department', label: 'Department', get: (s: Subscription) => s.department, empty: 'Unassigned' },
  { key: 'serviceType', label: 'Service Type', get: (s: Subscription) => s.serviceType, empty: 'Unassigned' },
  { key: 'platform', label: 'Platform', get: (s: Subscription) => s.platform, empty: 'Unassigned' },
  { key: 'owner', label: 'Owner', get: (s: Subscription) => s.owner, empty: 'Unassigned' },
] as const;

type SpendDimKey = typeof SPEND_DIMENSIONS[number]['key'];

export function AnalyticsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendDim, setSpendDim] = useState<SpendDimKey>(() => {
    const saved = localStorage.getItem('subtrack_spend_dim');
    return (SPEND_DIMENSIONS.some(d => d.key === saved) ? saved : 'category') as SpendDimKey;
  });

  useEffect(() => {
    apiGetSubscriptions()
      .then(data => setSubs(data))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem('subtrack_spend_dim', spendDim); }, [spendDim]);

  /* Spend grouped by the selected dimension (its own color map). */
  const spend = useMemo(() => {
    const dim = SPEND_DIMENSIONS.find(d => d.key === spendDim) || SPEND_DIMENSIONS[0];
    const map: Record<string, number> = {};
    subs.forEach(s => {
      const m = monthlyCost(s);
      if (m <= 0) return;
      const raw = dim.get(s);
      const key = (raw && String(raw).trim()) || dim.empty;
      map[key] = (map[key] || 0) + m;
    });
    const entries = Object.entries(map).sort((x, y) => y[1] - x[1]);
    const color: Record<string, string> = {};
    entries.forEach(([k], i) => { color[k] = PALETTE[i % PALETTE.length]; });
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return { entries, color, total, label: dim.label };
  }, [subs, spendDim]);

  /* ── Aggregations ─────────────────────────────────── */
  const a = useMemo(() => {
    const totalMonthly = subs.reduce((sum, s) => sum + monthlyCost(s), 0);
    const active = subs.filter(s => getStatusFromDates(s) === 'active');

    // Spend per category (monthly-normalised)
    const catMap: Record<string, number> = {};
    subs.forEach(s => {
      const m = monthlyCost(s);
      if (m <= 0) return;
      const cat = s.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + m;
    });
    // Stable category→color map — used to colour the top-subs bars and renewal dots.
    const categoryColor: Record<string, string> = {};
    Object.entries(catMap).sort((x, y) => y[1] - x[1]).forEach(([cat], i) => { categoryColor[cat] = PALETTE[i % PALETTE.length]; });

    // Top subscriptions by monthly cost
    const topSubs = subs
      .map(s => ({ id: s.id, name: s.name, value: monthlyCost(s), color: categoryColor[s.category || 'Other'] || PALETTE[0] }))
      .filter(s => s.value > 0)
      .sort((x, y) => y.value - x.value)
      .slice(0, 7);

    // Status mix
    const statusMap: Record<string, number> = {};
    subs.forEach(s => { const st = getStatusFromDates(s); statusMap[st] = (statusMap[st] || 0) + 1; });
    const statuses = Object.entries(statusMap).sort((x, y) => y[1] - x[1]);

    // Upcoming renewals (30d), soonest first
    const upcoming = subs
      .map(s => ({ sub: s, d: daysUntil(s.dates?.nextRenewal || s.dates?.endDate) }))
      .filter(x => x.d !== null && x.d >= 0 && x.d <= 30)
      .sort((x, y) => (x.d as number) - (y.d as number));

    const soon = upcoming.filter(x => (x.d as number) <= 7).length;

    return {
      totalMonthly, activeCount: active.length, total: subs.length,
      categoryColor,
      topSubs, topMax: topSubs[0]?.value || 1,
      statuses, upcoming, soon,
    };
  }, [subs]);

  /* ── KPI cards ────────────────────────────────────── */
  const kpis = [
    { label: 'Monthly Spend', value: formatCurrency(a.totalMonthly, 'INR'), sub: 'normalised to /mo', icon: IndianRupee, color: '#10B981' },
    { label: 'Annual Projection', value: formatCurrency(a.totalMonthly * 12, 'INR'), sub: 'monthly × 12', icon: TrendingUp, color: '#6366F1' },
    { label: 'Active', value: `${a.activeCount}`, sub: `of ${a.total} subscriptions`, icon: Activity, color: '#3B82F6' },
    { label: 'Renewing ≤ 7d', value: `${a.soon}`, sub: `${a.upcoming.length} within 30 days`, icon: Clock, color: a.soon > 0 ? '#EF4444' : '#F59E0B' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ height: 280, background: 'var(--bg-secondary)', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="empty-state">
        <BarChart3 size={64} />
        <h3>No data yet</h3>
        <p>Add subscriptions to see analytics.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 28px' }}>
        <BarChart3 size={26} /> Analytics
      </h1>

      {/* ── KPI row ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18, marginBottom: 32 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `2px solid ${k.color}` }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, background: `${k.color}1f` }}>
              <k.icon size={22} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{k.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row: Category donut + Top subs bars ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Spending by selected dimension */}
        <Panel
          icon={PieChart}
          title={`Spending by ${spend.label}`}
          subtitle="Monthly, normalised"
          action={
            <select
              value={spendDim}
              onChange={e => setSpendDim(e.target.value as SpendDimKey)}
              style={{
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '6px 10px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {SPEND_DIMENSIONS.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          }
        >
          {spend.total === 0 ? (
            <EmptyHint text={`No cost data to break down by ${spend.label.toLowerCase()} yet.`} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>
              <Donut
                segments={spend.entries.map(([k, val]) => ({ value: val, color: spend.color[k] }))}
                centerTop={formatCurrency(spend.total, 'INR')}
                centerBottom="per month"
              />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 12 }}>
                  {spend.entries.length} {spend.label.toLowerCase()}{spend.entries.length === 1 ? '' : 's'}
                </div>
                {/* Scrolls instead of stretching the card when there are many entries. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 232, overflowY: 'auto', paddingRight: 6 }}>
                  {spend.entries.map(([k, val]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: spend.color[k], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatCurrency(val, 'INR')}</span>
                      <span style={{ color: 'var(--text-tertiary)', minWidth: 38, textAlign: 'right' }}>{Math.round((val / spend.total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Top subscriptions */}
        <Panel icon={BarChart3} title="Top Subscriptions" subtitle="By monthly cost">
          {a.topSubs.length === 0 ? (
            <EmptyHint text="No priced subscriptions to rank yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {a.topSubs.map(s => (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6, fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatCurrency(s.value, 'INR')}/mo</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(4, (s.value / a.topMax) * 100)}%`, background: s.color, borderRadius: 999, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Row: Status mix + Upcoming renewals ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Status breakdown */}
        <Panel icon={Layers} title="Subscription Status" subtitle="Health overview">
          <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', gap: 2, marginBottom: 18, background: 'var(--bg-secondary)' }}>
            {a.statuses.map(([st, count]) => (
              <div key={st} title={`${st}: ${count}`} style={{ flex: count, background: statusColor(st) }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {a.statuses.map(([st, count]) => (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8125rem' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: statusColor(st), flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{st}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{count}</span>
                <span style={{ color: 'var(--text-tertiary)', minWidth: 34, textAlign: 'right' }}>{Math.round((count / a.total) * 100)}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Upcoming renewals */}
        <Panel icon={CalendarClock} title="Upcoming Renewals" subtitle="Next 30 days">
          {a.upcoming.length === 0 ? (
            <EmptyHint text="Nothing renews in the next 30 days." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {a.upcoming.map(({ sub: s, d }) => {
                const days = d as number;
                const urgent = days <= 7;
                const c = urgent ? '#EF4444' : days <= 15 ? '#F59E0B' : '#10B981';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.categoryColor[s.category || 'Other'] || 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{formatDate(s.dates?.nextRenewal || s.dates?.endDate)}</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${c}22`, color: c, whiteSpace: 'nowrap' }}>
                        {days === 0 ? 'Today' : `${days}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Reusable bits
   ══════════════════════════════════════════════════════ */

function Panel({ icon: Icon, title, subtitle, action, children }: { icon: typeof BarChart3; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Icon size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{text}</div>
  );
}

/* Crisp SVG donut — resolution-independent, no canvas resize bugs. */
function Donut({ segments, centerTop, centerBottom }: { segments: { value: number; color: string }[]; centerTop: string; centerBottom: string }) {
  const size = 200;
  const stroke = 32;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * C;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.1875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{centerTop}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{centerBottom}</span>
      </div>
    </div>
  );
}
