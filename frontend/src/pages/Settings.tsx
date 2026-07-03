/* ══════════════════════════════════════════════════════
   SubTrack — Settings Page (React + TypeScript)
   ══════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';
import { Sun, Moon, Monitor, Download, Upload, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { getSettings, saveSettings, applyTheme } from '@/utils/helpers';
import { CURRENCIES } from '@/utils/constants';
import { apiExportSubscriptions, apiUpdateProfile, apiGetMe } from '@/api/client';
import type { AppSettings } from '@/types';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  // Auto-refresh state (from user profile settings, not local)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(user?.settings?.autoRefreshEnabled ?? false);
  const [autoRefreshTime, setAutoRefreshTime] = useState(user?.settings?.autoRefreshTime ?? '08:00');
  const [savingAutoRefresh, setSavingAutoRefresh] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    if (key === 'theme') applyTheme(value as AppSettings['theme']);
  };

  const handleExport = async () => {
    try {
      const data = await apiExportSubscriptions();
      const blob = new Blob([JSON.stringify({ ...data, settings, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtrack-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch {
      showToast('Failed to export data', 'error');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.settings) {
          setSettings({ ...settings, ...data.settings });
          saveSettings(data.settings);
        }
        showToast('Data imported successfully', 'success');
      } catch {
        showToast('Invalid JSON file', 'error');
      }
    };
    input.click();
  };

  const themeOptions: { value: AppSettings['theme']; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28 }}>
        Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
        {/* Profile */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Profile</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem' }}>
            <div><span style={{ color: 'var(--text-tertiary)' }}>Name:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.name}</span></div>
            <div><span style={{ color: 'var(--text-tertiary)' }}>Email:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.email}</span></div>
            <div><span style={{ color: 'var(--text-tertiary)' }}>Role:</span> <span className={`badge badge-${user?.role === 'admin' ? 'active' : 'paused'}`}>{user?.role}</span></div>
          </div>
        </div>

        {/* Appearance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Appearance</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateSetting('theme', opt.value)}
                className={settings.theme === opt.value ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default Currency */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Default Currency</h3>
          <select
            className="form-select"
            value={settings.currency}
            onChange={e => updateSetting('currency', e.target.value)}
            style={{ maxWidth: 200 }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
            ))}
          </select>
        </div>

        {/* Auto-Refresh */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <RefreshCw size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Auto-Refresh</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div
                onClick={async () => {
                  const next = !autoRefreshEnabled;
                  setAutoRefreshEnabled(next);
                  setSavingAutoRefresh(true);
                  try {
                    const merged = { ...user?.settings, autoRefreshEnabled: next, autoRefreshTime };
                    await apiUpdateProfile({ settings: merged });
                    const fresh = await apiGetMe();
                    updateUser({ ...user!, settings: fresh.settings });
                    showToast(next ? 'Auto-refresh enabled' : 'Auto-refresh disabled', 'success');
                  } catch { showToast('Failed to update settings', 'error'); }
                  setSavingAutoRefresh(false);
                }}
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                  background: autoRefreshEnabled ? 'var(--primary)' : 'var(--border)',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: autoRefreshEnabled ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Enable daily auto-refresh
              </span>
              {savingAutoRefresh && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Saving...</span>}
            </label>

            {/* Time picker */}
            {autoRefreshEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Refresh at:</span>
                <input
                  type="time"
                  value={autoRefreshTime}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setAutoRefreshTime(val);
                    setSavingAutoRefresh(true);
                    try {
                      const merged = { ...user?.settings, autoRefreshEnabled, autoRefreshTime: val };
                      await apiUpdateProfile({ settings: merged });
                      const fresh = await apiGetMe();
                      updateUser({ ...user!, settings: fresh.settings });
                      showToast(`Refresh time set to ${val}`, 'success');
                    } catch { showToast('Failed to update time', 'error'); }
                    setSavingAutoRefresh(false);
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text-primary)', fontSize: '0.875rem',
                  }}
                />
              </div>
            )}

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>
              Subscriptions with API or Playwright integrations will refresh automatically at this time every day.
              OTP-required subscriptions are skipped.
            </p>
          </div>
        </div>

        {/* Data Management */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Data Management</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={14} /> Export Data
            </button>
            <button className="btn btn-secondary" onClick={handleImport}>
              <Upload size={14} /> Import Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
