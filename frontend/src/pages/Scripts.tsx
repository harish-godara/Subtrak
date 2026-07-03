/* ══════════════════════════════════════════════════════
   SubTrack — Scripts & API Page (React + TypeScript)
   Unified library for user-created and admin-created
   (global) script templates and API curl templates.
   ══════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { FileCode, Plus, Trash2, Copy, Edit3, Globe, Code2, Zap } from 'lucide-react';
import { apiGetTemplates, apiCreateTemplate, apiUpdateTemplate, apiDeleteTemplate, apiDuplicateTemplate } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_SCRIPT, DEFAULT_CURL } from '@/utils/constants';
import type { ScriptTemplate } from '@/types';

type FilterType = 'all' | 'script' | 'api';
type FilterOwner = 'all' | 'mine' | 'global';

export function ScriptsPage() {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScriptTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOwner, setFilterOwner] = useState<FilterOwner>('all');

  // Form state
  const [formName, setFormName] = useState('');
  const [formPlatform, setFormPlatform] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formMode, setFormMode] = useState<'data' | 'token'>('data');
  const [formType, setFormType] = useState<'script' | 'api'>('script');
  const [formGlobal, setFormGlobal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await apiGetTemplates();
      setTemplates(data);
    } catch {
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (template?: ScriptTemplate) => {
    if (template) {
      setEditing(template);
      setIsNew(false);
      setFormName(template.name);
      setFormPlatform(template.platform);
      setFormDescription(template.description);
      setFormContent(template.script_content);
      setFormMode(template.script_mode);
      setFormType(template.template_type || 'script');
      setFormGlobal(template.is_global || false);
    } else {
      setEditing({} as ScriptTemplate);
      setIsNew(true);
      setFormName('');
      setFormPlatform('');
      setFormDescription('');
      setFormContent(DEFAULT_SCRIPT);
      setFormMode('data');
      setFormType('script');
      setFormGlobal(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) {
      showToast('Name and content are required', 'warning');
      return;
    }

    try {
      const data = {
        name: formName,
        platform: formPlatform,
        description: formDescription,
        script_content: formContent,
        script_mode: formMode,
        credential_fields: editing?.credential_fields || [],
        template_type: formType,
        is_global: isAdmin ? formGlobal : false,
      };

      if (isNew) {
        const created = await apiCreateTemplate(data);
        setTemplates(prev => [...prev, created]);
        showToast('Template created', 'success');
      } else if (editing?.id) {
        const updated = await apiUpdateTemplate(editing.id, data);
        setTemplates(prev => prev.map(t => t.id === editing.id ? updated : t));
        showToast('Template updated', 'success');
      }
      setEditing(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await apiDeleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete template', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await apiDuplicateTemplate(id);
      setTemplates(prev => [...prev, copy]);
      showToast('Template duplicated as private copy', 'success');
    } catch {
      showToast('Failed to duplicate template', 'error');
    }
  };

  // ── Filtering ──
  const filtered = templates.filter(t => {
    if (filterType === 'script' && t.template_type !== 'script') return false;
    if (filterType === 'api' && t.template_type !== 'api') return false;
    if (filterOwner === 'mine' && t.is_global) return false;
    if (filterOwner === 'global' && !t.is_global) return false;
    return true;
  });

  const globalTemplates = filtered.filter(t => t.is_global);
  const userTemplates = filtered.filter(t => !t.is_global);

  // ── Render helpers ──

  const typeBadgeStyle = (type: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 20,
    background: type === 'api'
      ? 'rgba(251, 191, 36, 0.12)'
      : 'rgba(99, 102, 241, 0.12)',
    color: type === 'api' ? '#f59e0b' : '#818cf8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  });

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: active ? 600 : 500,
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  });

  const renderTemplateCard = (t: ScriptTemplate, canEdit: boolean) => (
    <div
      key={t.id}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          {t.is_global ? (
            <Globe size={15} style={{ color: '#4ade80', flexShrink: 0 }} />
          ) : (
            <FileCode size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          )}
          <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{t.name}</span>
          <span style={typeBadgeStyle(t.template_type)}>
            {t.template_type === 'api' ? <><Zap size={10} /> API</> : <><Code2 size={10} /> Script</>}
          </span>
          {t.platform && (
            <span className="badge badge-active" style={{ fontSize: '0.625rem' }}>{t.platform}</span>
          )}
          <span className="badge badge-paused" style={{ fontSize: '0.625rem' }}>{t.script_mode}</span>
          {t.is_global && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '0.625rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80',
            }}>
              <Globe size={9} /> Global
            </span>
          )}
        </div>
        {t.description && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginLeft: 23, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 12 }}>
        {canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => openEditor(t)} title="Edit">
            <Edit3 size={14} />
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(t.id)} title="Duplicate as private copy">
          <Copy size={14} />
        </button>
        {canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)} title="Delete" style={{ color: 'var(--danger)' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, background: 'var(--bg-secondary)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Scripts & API</h1>
        <button className="btn btn-primary" onClick={() => openEditor()}>
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {/* Type filters */}
        <div style={{ display: 'flex', gap: 4, padding: '3px', background: 'var(--bg-secondary)', borderRadius: 24 }}>
          {([
            { key: 'all' as FilterType, label: 'All' },
            { key: 'script' as FilterType, label: 'Scripts' },
            { key: 'api' as FilterType, label: 'APIs' },
          ]).map(f => (
            <button key={f.key} style={filterBtnStyle(filterType === f.key)} onClick={() => setFilterType(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        {/* Owner filters */}
        <div style={{ display: 'flex', gap: 4, padding: '3px', background: 'var(--bg-secondary)', borderRadius: 24 }}>
          {([
            { key: 'all' as FilterOwner, label: 'All' },
            { key: 'mine' as FilterOwner, label: 'My Templates' },
            { key: 'global' as FilterOwner, label: 'Global' },
          ]).map(f => (
            <button key={f.key} style={filterBtnStyle(filterOwner === f.key)} onClick={() => setFilterOwner(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* No results */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileCode size={64} />
          <h3>{templates.length === 0 ? 'No templates yet' : 'No matching templates'}</h3>
          <p>
            {templates.length === 0
              ? 'Create reusable Playwright scripts or API curl templates for subscription integration.'
              : 'Try changing the filters above.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Global Templates Section */}
          {globalTemplates.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                fontSize: '0.75rem', fontWeight: 600, color: '#4ade80',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <Globe size={14} />
                Global Templates
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>
                  — available to all users
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {globalTemplates.map(t => renderTemplateCard(t, isAdmin))}
              </div>
            </div>
          )}

          {/* User Templates Section */}
          {userTemplates.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <FileCode size={14} />
                My Templates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userTemplates.map(t => renderTemplateCard(t, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <Modal
          isOpen={true}
          onClose={() => setEditing(null)}
          title={isNew ? 'New Template' : `Edit: ${editing.name || formName}`}
          maxWidth="800px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {isNew ? 'Create Template' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Row 1: Name + Platform */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Interakt Wallet" />
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <input className="form-input" value={formPlatform} onChange={e => setFormPlatform(e.target.value)} placeholder="e.g. Interakt Waba" />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="What does this template do?" />
            </div>

            {/* Row 3: Type + Mode + Global toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formType}
                  onChange={e => {
                    const newType = e.target.value as 'script' | 'api';
                    setFormType(newType);
                    // Set sensible default content when switching types
                    if (isNew || !formContent.trim() || formContent === DEFAULT_SCRIPT || formContent === DEFAULT_CURL) {
                      setFormContent(newType === 'api' ? DEFAULT_CURL : DEFAULT_SCRIPT);
                    }
                  }}
                >
                  <option value="script">Script (Playwright)</option>
                  <option value="api">API (Curl)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mode</label>
                <select className="form-select" value={formMode} onChange={e => setFormMode(e.target.value as 'data' | 'token')}>
                  <option value="data">Data (returns JSON output)</option>
                  <option value="token">Token (captures auth token)</option>
                </select>
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formGlobal ? 'rgba(74, 222, 128, 0.4)' : 'var(--border)'}`,
                    background: formGlobal ? 'rgba(74, 222, 128, 0.06)' : 'var(--bg-primary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontSize: '0.8125rem', fontWeight: 500,
                    color: formGlobal ? '#4ade80' : 'var(--text-secondary)',
                  }}>
                    <input
                      type="checkbox"
                      checked={formGlobal}
                      onChange={e => setFormGlobal(e.target.checked)}
                      style={{ accentColor: '#4ade80' }}
                    />
                    <Globe size={14} />
                    Global (visible to all)
                  </label>
                </div>
              )}
            </div>

            {/* Row 4: Content */}
            <div className="form-group">
              <label className="form-label">{formType === 'api' ? 'Curl Command *' : 'Script Content *'}</label>
              <textarea
                className="form-textarea"
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder={formType === 'api' ? "curl -X GET 'https://api.example.com/data' \\\n  -H 'Authorization: Bearer YOUR_TOKEN'" : undefined}
                style={{
                  fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                  fontSize: '0.8125rem',
                  minHeight: formType === 'api' ? 160 : 300,
                  background: 'var(--bg-code)',
                  color: '#e2e8f0',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  lineHeight: 1.6,
                  tabSize: 4,
                }}
                spellCheck={false}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
