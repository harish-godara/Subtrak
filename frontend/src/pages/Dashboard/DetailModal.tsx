/* ══════════════════════════════════════════════════════
   SubTrack — Subscription Detail Modal + Delete Confirm
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { RefreshCw, Repeat, Edit3, Trash2, AlertTriangle, ChevronDown, ChevronUp, Code, Terminal, Database } from 'lucide-react';
import { formatCurrency, formatDate, timeAgo, getStatusFromDates } from '@/utils/helpers';
import { Modal } from '@/components/Modal';
import { RenewModal } from './RenewModal';
import type { DetailModalProps } from './types';
import type { RenewalRecord } from '@/types';

const CHANGE_TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  renew: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  upgrade: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
  downgrade: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' },
  update: { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
};

export function DetailModal({
  subscription: sub,
  refreshing, deleting, showDeleteConfirm, renewing, showRenewModal,
  onClose, onRefresh, onDelete, onEdit, onRenew, setShowDeleteConfirm, setShowRenewModal,
}: DetailModalProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <>
      <Modal
        isOpen={true}
        onClose={() => { onClose(); }}
        title={sub.name}
        maxWidth="720px"
        footer={
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', width: '100%', padding: '4px 0' }}>
            {sub.integration?.type !== 'manual' && (
              <button
                title="Refresh Data"
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: refreshing === sub.id ? 0.6 : 1
                }}
                disabled={refreshing === sub.id}
                onClick={(e) => onRefresh(sub.id, e)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <RefreshCw size={18} className={refreshing === sub.id ? 'spinning' : ''} />
              </button>
            )}
            <button
              title="Renew / Update Subscription"
              style={{
                width: 40, height: 40, borderRadius: '50%', border: '1px solid transparent',
                background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onClick={() => setShowRenewModal(true)}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#10b981';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                e.currentTarget.style.color = '#10b981';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Repeat size={18} />
            </button>
            <button
              title="Edit Integration"
              style={{
                width: 40, height: 40, borderRadius: '50%', border: '1px solid transparent',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onClick={() => onEdit(sub.id)}
              onMouseEnter={e => { 
                e.currentTarget.style.background = 'var(--accent)'; 
                e.currentTarget.style.color = '#fff'; 
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = 'var(--accent-soft)'; 
                e.currentTarget.style.color = 'var(--accent)'; 
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Edit3 size={18} />
            </button>
            <button 
              title="Delete Subscription"
              style={{
                width: 40, height: 40, borderRadius: '50%', border: '1px solid transparent',
                background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onClick={() => setShowDeleteConfirm(true)}
              onMouseEnter={e => { 
                e.currentTarget.style.background = '#ef4444'; 
                e.currentTarget.style.color = '#fff'; 
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; 
                e.currentTarget.style.color = '#ef4444'; 
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: 'Label', value: sub.category },
              { label: 'Status', value: getStatusFromDates(sub) },
              { label: 'Plan', value: sub.planName || '—' },
              { label: 'Platform', value: sub.platform || '—' },
              { label: 'Service', value: sub.serviceType || '—' },
              { label: 'Client', value: sub.client || '—' },
              { label: 'Department', value: sub.department || '—' },
              { label: 'Owner', value: sub.owner || '—' },
              { label: 'Billing Cycle', value: sub.billingCycle },
              { label: 'Currency', value: sub.currency },
              { label: 'Amount', value: sub.cost?.amount ? formatCurrency(sub.cost.amount, sub.currency) : '—' },
              { label: 'Credits', value: sub.credits?.balance != null ? String(sub.credits.balance) : '—' },
              { label: 'Auto-Renew', value: sub.autoRenew ? '✅ On' : '❌ Off' },
              { label: 'Start Date', value: formatDate(sub.dates?.startDate) },
              { label: 'End Date', value: formatDate(sub.dates?.endDate) },
              { label: 'Renewal Date', value: formatDate(sub.dates?.nextRenewal) },
              { label: 'Last Refreshed', value: sub.dates?.lastRefreshed ? timeAgo(sub.dates.lastRefreshed) : 'Never' },
              { label: 'Integration', value: sub.integration?.type || 'manual' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* People Using */}
          {sub.peopleUsing && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>People Using</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sub.peopleUsing.split(',').map((p, i) => (
                  <span key={i} style={{ padding: '2px 10px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>{p.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {sub.notes && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sub.notes}</div>
            </div>
          )}

          {/* Invoices & Payments */}
          {sub.invoices && (sub.invoices as any[]).length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>Invoices & Payments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(sub.invoices as any[]).map((inv: any, idx: number) => (
                  <div key={inv.id || idx} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 24 }}>#{idx+1}</span>
                    {inv.date && <span style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.date)}</span>}
                    {inv.amount != null && <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(inv.amount, inv.currency || sub.currency)}</span>}
                    {inv.status && <span style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{inv.status}</span>}
                    {inv.credits != null && <span style={{ color: 'var(--text-tertiary)' }}>{inv.credits} credits</span>}
                    {inv.planName && <span style={{ color: 'var(--text-tertiary)' }}>{inv.planName}</span>}
                    {inv.paymentMethod && <span style={{ color: 'var(--text-tertiary)' }}>{inv.paymentMethod}</span>}
                    {inv.paidBy && <span style={{ color: 'var(--text-tertiary)' }}>by {inv.paidBy}</span>}
                    {inv.paymentRef && <span style={{ color: 'var(--text-tertiary)' }}>Ref: {inv.paymentRef}</span>}
                    {inv.invoiceLink && <a href={inv.invoiceLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: 'auto' }}>Invoice ↗</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renewal History */}
          {sub.renewals && (sub.renewals as RenewalRecord[]).length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>Renewal History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...(sub.renewals as RenewalRecord[])].reverse().map((r, idx) => {
                  const badge = CHANGE_TYPE_BADGE[r.changeType] || CHANGE_TYPE_BADGE.update;
                  return (
                    <div key={r.id || idx} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'capitalize', padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color }}>{r.changeType}</span>
                      {r.planName && <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.planName}</span>}
                      {r.amount != null && <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.amount, r.currency || sub.currency)}</span>}
                      {r.billingCycle && <span style={{ color: 'var(--text-tertiary)' }}>/ {r.billingCycle}</span>}
                      {(r.periodStart || r.periodEnd) && <span style={{ color: 'var(--text-tertiary)' }}>{formatDate(r.periodStart)} → {formatDate(r.periodEnd)}</span>}
                      {r.notes && <span style={{ color: 'var(--text-tertiary)' }}>{r.notes}</span>}
                      {r.createdAt && <span style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{formatDate(r.createdAt)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Data */}
          {sub.customData && Object.keys(sub.customData).filter(k => !k.startsWith('_')).length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Custom Fields</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(sub.customData)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([key, val]) => (
                  <div key={key} style={{ fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{key}:</span>{' '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          {sub.integration?.type !== 'manual' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              
              {/* Last Response */}
              {!!sub.integration?.lastResponse && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Database size={13} /> Latest API Response
                  </div>
                  <pre style={{ 
                    fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, 
                    overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text-primary)',
                    maxHeight: 250, margin: 0, fontFamily: 'monospace'
                  }}>
                    {JSON.stringify(sub.integration.lastResponse, null, 2)}
                  </pre>
                </div>
              )}

              <button 
                onClick={() => setShowTechnical(!showTechnical)}
                style={{ 
                  width: '100%', background: 'none', border: 'none', padding: 0, 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  cursor: 'pointer', color: 'var(--text-secondary)' 
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  View Integration Script & Curls
                </span>
                {showTechnical ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showTechnical && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Script */}
                  {sub.integration?.scriptContent && (
                    <div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Code size={12} /> Playwright Script
                      </div>
                      <pre style={{ 
                        fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, 
                        overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text-primary)',
                        maxHeight: 200, margin: 0
                      }}>
                        {sub.integration.scriptContent}
                      </pre>
                    </div>
                  )}

                  {/* Curls */}
                  {((sub.integration?.requests as any[]) || (sub.integration?.curlCommand ? [1] : [])).length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Terminal size={12} /> Curl Commands
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sub.integration?.type === 'curl' ? (
                          <pre style={{ 
                            fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, 
                            overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text-primary)', margin: 0
                          }}>
                            {sub.integration.curlCommand}
                          </pre>
                        ) : (
                          (sub.integration?.requests as any[])?.map((req, idx) => (
                            <div key={idx}>
                              <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{req.label || `Request ${idx + 1}`}</div>
                              <pre style={{ 
                                fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, 
                                overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text-primary)', margin: 0
                              }}>
                                {req.curlCommand}
                              </pre>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        @keyframes spinning {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning { animation: spinning 1s linear infinite; }
      `}</style>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Subscription"
          maxWidth="400px"
          footer={
            <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ borderRadius: '10px', fontWeight: 600 }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                No, Keep it
              </button>
              <button 
                className="btn btn-sm" 
                style={{ 
                  background: '#ef4444', color: '#fff', borderRadius: '10px', 
                  fontWeight: 600, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          }
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Are you sure?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This will permanently delete <strong>{sub.name}</strong> and all its associated data. This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* Renew / Update / Upgrade Modal */}
      {showRenewModal && (
        <RenewModal
          subscription={sub}
          renewing={renewing}
          onClose={() => setShowRenewModal(false)}
          onRenew={onRenew}
        />
      )}
    </>
  );
}
