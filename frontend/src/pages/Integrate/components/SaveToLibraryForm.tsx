/* ══════════════════════════════════════════════════════
   SubTrack — SaveToLibraryForm
   Reusable save-to-library form for scripts and curls.
   Uses IntegrateContext — eliminates 3× copy-paste.
   ══════════════════════════════════════════════════════ */

import { Save } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import type { ScriptMode } from '../integrate.types';

interface SaveToLibraryFormProps {
  type: 'script' | 'api';
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function SaveToLibraryForm({ type, scrollRef }: SaveToLibraryFormProps) {
  const ctx = useIntegrate();
  const isScript = type === 'script';

  const name = isScript ? ctx.saveScriptName : ctx.saveCurlName;
  const setName = isScript ? ctx.setSaveScriptName : ctx.setSaveCurlName;
  const platform = isScript ? ctx.saveScriptPlatform : ctx.saveCurlPlatform;
  const setPlatform = isScript ? ctx.setSaveScriptPlatform : ctx.setSaveCurlPlatform;
  const desc = isScript ? ctx.saveScriptDesc : ctx.saveCurlDesc;
  const setDesc = isScript ? ctx.setSaveScriptDesc : ctx.setSaveCurlDesc;
  const saving = isScript ? ctx.savingScript : ctx.savingCurl;
  const onSave = isScript ? ctx.handleSaveScriptToLibrary : ctx.handleSaveCurlToLibrary;
  const onCancel = () => isScript ? ctx.setShowSaveScript(false) : ctx.setShowSaveCurl(null);

  return (
    <div ref={scrollRef} style={{ marginTop: 20, padding: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, scrollMarginBottom: '40px' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Save size={15} style={{ color: 'var(--accent)' }} />
        {isScript ? 'Save to Scripts & API Library' : 'Save API Curl to Library'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Name *</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={isScript ? 'e.g. Interakt Login' : 'e.g. Fetch Account Data'} style={{ fontSize: '0.8125rem' }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Platform</label>
          <input className="form-input" value={platform} onChange={e => setPlatform(e.target.value)} placeholder="e.g. Interakt waba" style={{ fontSize: '0.8125rem' }} />
        </div>
      </div>
      {isScript ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this script do?" style={{ fontSize: '0.8125rem' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Script Mode</label>
            <select className="form-select" value={ctx.saveScriptModeType} onChange={e => ctx.setSaveScriptModeType(e.target.value as ScriptMode)} style={{ fontSize: '0.8125rem' }}>
              <option value="data">Data Mode</option>
              <option value="token">Token Mode</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Description</label>
          <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this request do?" style={{ fontSize: '0.8125rem' }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</button>
      </div>
    </div>
  );
}
