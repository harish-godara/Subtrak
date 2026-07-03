/* ══════════════════════════════════════════════════════
   SubTrack — CurlsStep
   Token-mode multi-curl builder. Uses Context.
   Uses TemplatePicker + SaveToLibraryForm components.
   ══════════════════════════════════════════════════════ */

import { ArrowRight, Plus, Trash2, Key, Save } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import { TemplatePicker } from '../components/TemplatePicker';
import { SaveToLibraryForm } from '../components/SaveToLibraryForm';

export function CurlsStep() {
  const ctx = useIntegrate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>API Requests</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>Use <code style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-secondary)', fontSize: '0.75rem' }}>{`{{TOKEN}}`}</code> — it'll be replaced with the captured token.</p>
          </div>
          {ctx.capturedToken && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 'var(--radius-md)' }}>
              <Key size={14} style={{ color: '#4ade80' }} />
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Token ready</span>
            </div>
          )}
        </div>

        <TemplatePicker templateType="api" emptyLabel="— or paste manually —" />

        {ctx.curlRequests.map((req, idx) => (
          <div key={req.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 16, background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>#{idx + 1}</span>
              <input className="form-input" value={req.label} onChange={e => ctx.updateCurlRequest(req.id, { label: e.target.value })} style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 500, padding: '6px 10px' }} placeholder="Request label" />
              <button onClick={() => ctx.removeCurlRequest(req.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
            </div>
            <textarea className="form-textarea" value={req.curlText} onChange={e => ctx.updateCurlRequest(req.id, { curlText: e.target.value })} placeholder={"curl -X GET 'https://api.example.com/data' \\\n  -H 'Authorization: Bearer {{TOKEN}}'"}
              style={{ fontFamily: 'monospace', fontSize: '0.8125rem', minHeight: 100 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              {req.response && (
                <button className="btn btn-secondary btn-sm" onClick={() => { ctx.setShowSaveCurl(req.id); ctx.setSaveCurlName(req.label || ''); ctx.setSaveCurlPlatform(ctx.name || ''); setTimeout(() => ctx.saveCurlContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={13} /> Save to Library
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => ctx.testTokenCurl(req.id)} disabled={req.testing}>{req.testing ? 'Testing...' : 'Test API'}</button>
            </div>
            {ctx.showSaveCurl === req.id && <SaveToLibraryForm type="api" scrollRef={ctx.saveCurlContainerRef} />}
            {req.response && (
              <pre style={{ marginTop: 12, background: 'var(--bg-code)', color: '#e2e8f0', padding: 14, borderRadius: 'var(--radius-md)', fontSize: '0.75rem', maxHeight: 160, overflow: 'auto', lineHeight: 1.6 }}>{JSON.stringify(req.response, null, 2)}</pre>
            )}
          </div>
        ))}
        <button className="btn btn-secondary" onClick={() => ctx.addCurlRequest()} style={{ width: '100%', borderStyle: 'dashed' }}><Plus size={16} /> Add API Request</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
        <button className="btn btn-primary" onClick={() => ctx.setStep('map')} disabled={ctx.curlRequests.length === 0}>Map Fields <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}
