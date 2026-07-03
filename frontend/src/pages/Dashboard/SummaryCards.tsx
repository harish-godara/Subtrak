/* ══════════════════════════════════════════════════════
   SubTrack — Dashboard Summary Cards
   ══════════════════════════════════════════════════════ */

import { Activity, IndianRupee, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import type { SummaryCardsProps } from './types';

export function SummaryCards({ activeCount, totalCount, totalMonthly, upcomingCount }: SummaryCardsProps) {
  const stats = [
    { label: 'Active', value: String(activeCount), sub: `of ${totalCount} total`, icon: Activity, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
    { label: 'Monthly Spend', value: formatCurrency(totalMonthly, 'INR'), sub: 'across active subs', icon: IndianRupee, color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
    { label: 'Upcoming Renewals', value: String(upcomingCount), sub: 'within 30 days', icon: Calendar, color: '#F97316', bg: 'rgba(249, 115, 22, 0.08)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
      {stats.map(stat => (
        <div key={stat.label} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color
          }}>
            <stat.icon size={20} strokeWidth={2} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {stat.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
