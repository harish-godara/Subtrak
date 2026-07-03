/* ══════════════════════════════════════════════════════
   SubTrack — Dashboard Page (React + TypeScript)
   ══════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, LayoutGrid, List } from 'lucide-react';
import { apiGetSubscriptions, apiRefreshSubscription, apiDeleteSubscription, apiRenewSubscription } from '@/api/client';
import type { RenewSubscriptionPayload } from '@/api/client';
import { daysUntil, getStatusFromDates } from '@/utils/helpers';
import { useToast } from '@/components/Toast';
import type { Subscription } from '@/types';

import { SummaryCards } from './SummaryCards';
import { SubscriptionCard, AddNewCard } from './SubscriptionCard';
import { DetailModal } from './DetailModal';

export function DashboardPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('subtrack_view_mode') as 'grid' | 'list') || 'list');
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('subtrack_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await apiGetSubscriptions();
      setSubs(data);
    } catch (err) {
      showToast('Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = subs;
    if (filter !== 'all') {
      result = result.filter(s => getStatusFromDates(s) === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [subs, filter, search]);

  // Summary stats
  const active = subs.filter(s => getStatusFromDates(s) === 'active');
  const totalMonthly = active.reduce((sum, s) => {
    if (!s.cost?.amount) return sum;
    const monthly = s.cost.cycle === 'yearly' ? s.cost.amount / 12 : s.cost.amount;
    return sum + monthly;
  }, 0);
  const upcoming = subs.filter(s => {
    const d = daysUntil(s.dates?.nextRenewal || s.dates?.endDate);
    return d !== null && d > 0 && d <= 30;
  });

  const handleRefresh = async (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(subId);
    try {
      const updated = await apiRefreshSubscription(subId);
      setSubs(prev => prev.map(s => s.id === subId ? updated : s));
      if (selectedSub?.id === subId) setSelectedSub(updated);
      showToast('Data refreshed successfully', 'success');
    } catch (err) {
      showToast('Failed to refresh data', 'error');
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedSub) return;
    setDeleting(true);
    try {
      await apiDeleteSubscription(selectedSub.id);
      showToast('Subscription deleted successfully', 'success');
      setSubs(prev => prev.filter(s => s.id !== selectedSub.id));
      setSelectedSub(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      showToast('Failed to delete subscription', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRenew = async (payload: RenewSubscriptionPayload) => {
    if (!selectedSub) return;
    setRenewing(true);
    try {
      const updated = await apiRenewSubscription(selectedSub.id, payload);
      setSubs(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedSub(updated);
      setShowRenewModal(false);
      showToast(`"${updated.name}" renewed successfully`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to renew subscription', 'error');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ height: 120, background: 'var(--bg-secondary)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 240, background: 'var(--bg-secondary)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
            Subscriptions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Track and manage all your active subscriptions.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: '0.875rem', color: 'var(--text-primary)', width: 180,
              }}
            />
          </div>
          {/* View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 4 }}>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent', boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent', boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none', color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <LayoutGrid size={16} />
            </button>
          </div>
          <select
            className="form-select"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 'auto', padding: '8px 36px 8px 12px' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => navigate('/integrate')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Plus size={16} />
            Add New
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        activeCount={active.length}
        totalCount={subs.length}
        totalMonthly={totalMonthly}
        upcomingCount={upcoming.length}
      />

      {/* Subscriptions */}
      {viewMode === 'grid' ? (
        <div style={{ background: 'var(--bg-input)', padding: '32px', borderRadius: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {filtered.map((sub, i) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                index={i}
                viewMode="grid"
                refreshing={refreshing}
                onSelect={setSelectedSub}
                onRefresh={handleRefresh}
              />
            ))}
            <AddNewCard viewMode="grid" onNavigate={() => navigate('/integrate')} />
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-input)', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* List Header */}
          {subs.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(250px, 2fr) minmax(150px, 1.5fr) minmax(200px, 1.5fr) minmax(200px, 2fr) 100px 40px', 
              gap: 16, padding: '0 24px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 
            }}>
              <div>Service</div>
              <div>Plan Details</div>
              <div>Credits / Usage</div>
              <div>Term Dates</div>
              <div>Status</div>
              <div></div>
            </div>
          )}

          {/* List Rows */}
          {filtered.map((sub, i) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              index={i}
              viewMode="list"
              refreshing={refreshing}
              onSelect={setSelectedSub}
              onRefresh={handleRefresh}
            />
          ))}
          <AddNewCard viewMode="list" onNavigate={() => navigate('/integrate')} />
        </div>
      )}

      {/* Detail Modal */}
      {selectedSub && (
        <DetailModal
          subscription={selectedSub}
          refreshing={refreshing}
          deleting={deleting}
          showDeleteConfirm={showDeleteConfirm}
          renewing={renewing}
          showRenewModal={showRenewModal}
          onClose={() => { setSelectedSub(null); setShowRenewModal(false); }}
          onRefresh={handleRefresh}
          onDelete={handleDelete}
          onEdit={(id) => navigate(`/integrate?id=${id}`)}
          onRenew={handleRenew}
          setShowDeleteConfirm={setShowDeleteConfirm}
          setShowRenewModal={setShowRenewModal}
        />
      )}
    </>
  );
}
