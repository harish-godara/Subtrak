/* ══════════════════════════════════════════════════════
   SubTrack — Admin Page (React + TypeScript)
   ══════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { Shield, Users, BarChart3, FileCode, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { apiAdminGetUsers, apiAdminGetStats, apiAdminDeleteUser, apiAdminChangeRole } from '@/api/client';
import type { AdminUser, AdminStats } from '@/types';

export function AdminPage() {
  const { isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        apiAdminGetUsers(),
        apiAdminGetStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch {
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}" and all their data? This cannot be undone.`)) return;
    try {
      await apiAdminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`User "${userName}" deleted`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiAdminChangeRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u));
      showToast(`Role updated to ${newRole}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change role', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <Shield size={64} />
        <h3>Admin Access Required</h3>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 60, background: 'var(--bg-secondary)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28 }}>
        Admin Panel
      </h1>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Users', value: stats.total_users, icon: <Users size={20} /> },
            { label: 'Total Subscriptions', value: stats.total_subscriptions, icon: <BarChart3 size={20} /> },
            { label: 'Total Templates', value: stats.total_templates, icon: <FileCode size={20} /> },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ color: 'var(--accent)', opacity: 0.8 }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Users ({users.length})
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Role', 'Subs', 'Templates', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    className="form-select"
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === user?.id}
                    style={{ padding: '4px 28px 4px 8px', fontSize: '0.75rem', width: 'auto' }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.subscription_count}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.template_count}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={u.id === user?.id}
                    onClick={() => handleDelete(u.id, u.name)}
                    style={{ color: 'var(--danger)', opacity: u.id === user?.id ? 0.3 : 1 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
