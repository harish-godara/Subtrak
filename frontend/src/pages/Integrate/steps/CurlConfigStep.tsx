/* ══════════════════════════════════════════════════════
   SubTrack — CurlConfigStep
   Curl API configuration. Uses Context — zero props.
   Uses TemplatePicker + SaveToLibraryForm components.
   ══════════════════════════════════════════════════════ */

import { ArrowRight, Key, Save } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import { TemplatePicker } from '../components/TemplatePicker';
import { SaveToLibraryForm } from '../components/SaveToLibraryForm';

export function CurlConfigStep() {
  const ctx = useIntegrate();

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>Paste Curl Command</h2>

      {/* API Key Input */}
      <div style={{ marginBottom: 16, background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Key size={13} style={{ color: 'var(--accent)' }} /> API Key (Optional)
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {ctx.apiKeyStored && !ctx.showApiKey ? (
            <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              API Key: ●●●●●●●● (saved in vault)
            </div>
          ) : (
            <input type={ctx.showApiKey ? "text" : "password"} className="form-input" style={{ flex: 1 }} placeholder="Paste your API key here" value={ctx.apiKeyInput} onChange={e => ctx.setApiKeyInput(e.target.value)} />
          )}
          {ctx.apiKeyStored && !ctx.showApiKey ? (
            <button className="btn btn-secondary btn-sm" onClick={() => ctx.setShowApiKey(true)}>Change</button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => ctx.setShowApiKey(!ctx.showApiKey)}>{ctx.showApiKey ? 'Hide' : 'Show'}</button>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
          Use <strong>{`{{API_KEY}}`}</strong> as a placeholder in your curl command below. The key is encrypted & stored securely.
        </div>
      </div>

      {/* Template Picker */}
      <TemplatePicker templateType="api" />

      <textarea className="form-textarea" value={ctx.curlText} onChange={e => ctx.setCurlText(e.target.value)}
        placeholder={"curl -X GET 'https://api.example.com/account' \\\n  -H 'Authorization: Bearer YOUR_TOKEN'"}
        style={{ fontFamily: 'monospace', fontSize: '0.8125rem', minHeight: 160 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={ctx.testCurl} disabled={ctx.testing}>{ctx.testing ? 'Testing...' : 'Test API'}</button>
        {ctx.apiResponse && (
          <button className="btn btn-secondary" onClick={() => { ctx.setShowSaveCurl('simple'); ctx.setSaveCurlName(ctx.name || ''); ctx.setSaveCurlPlatform(ctx.name || ''); setTimeout(() => ctx.saveSimpleCurlContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={15} /> Save to Library
          </button>
        )}
        <button className="btn btn-primary" onClick={() => ctx.setStep('map')} disabled={!ctx.curlText.trim()}>Map Fields <ArrowRight size={14} /></button>
      </div>

      {/* Save to Library Form */}
      {ctx.showSaveCurl === 'simple' && (
        <SaveToLibraryForm type="api" scrollRef={ctx.saveSimpleCurlContainerRef} />
      )}

      {ctx.apiResponse && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>API Response</h3>
          <pre style={{ background: 'var(--bg-code)', color: '#e2e8f0', padding: 16, borderRadius: 'var(--radius-md)', fontSize: '0.75rem', maxHeight: 200, overflow: 'auto', lineHeight: 1.6 }}>
            {JSON.stringify(ctx.apiResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
