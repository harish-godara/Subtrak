/* ══════════════════════════════════════════════════════
   SubTrack — TemplatePicker
   Reusable template dropdown with Global/User groups.
   Uses IntegrateContext — eliminates 3× copy-paste.
   ══════════════════════════════════════════════════════ */

import { Zap, FileCode } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';

interface TemplatePickerProps {
  templateType: 'script' | 'api';
  emptyLabel?: string;
}

export function TemplatePicker({ templateType, emptyLabel }: TemplatePickerProps) {
  const { savedTemplates, selectedTemplateId, applyTemplate } = useIntegrate();

  const available = savedTemplates.filter(t => t.template_type === templateType);
  if (available.length === 0) return null;

  const globalTpls = available.filter(t => t.is_global);
  const userTpls = available.filter(t => !t.is_global);
  const Icon = templateType === 'script' ? FileCode : Zap;

  return (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} style={{ color: templateType === 'script' ? 'var(--text-secondary)' : '#f59e0b' }} />
        {templateType === 'script' ? 'Load from template' : 'Select a saved API template'}
      </label>
      <select className="form-select" value={selectedTemplateId} onChange={e => applyTemplate(e.target.value)} style={{ fontSize: '0.8125rem' }}>
        <option value="">{emptyLabel || (templateType === 'script' ? '— or write a custom script below —' : '— or paste manually below —')}</option>
        {globalTpls.length > 0 && (
          <optgroup label="🌐 Global Templates">
            {globalTpls.map(t => <option key={t.id} value={t.id}>{t.name}{t.platform ? ` · ${t.platform}` : ''} — {t.script_mode} mode</option>)}
          </optgroup>
        )}
        {userTpls.length > 0 && (
          <optgroup label="📄 My Templates">
            {userTpls.map(t => <option key={t.id} value={t.id}>{t.name}{t.platform ? ` · ${t.platform}` : ''} — {t.script_mode} mode</option>)}
          </optgroup>
        )}
      </select>
    </div>
  );
}
