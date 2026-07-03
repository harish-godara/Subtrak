/* ══════════════════════════════════════════════════════
   SubTrack — PlaywrightConfigStep
   Script editor + terminal. Uses Context — zero props.
   Uses TemplatePicker, SaveToLibraryForm, Terminal.
   ══════════════════════════════════════════════════════ */

import { ArrowRight, Bot, Key, Database, Play, Square, Check, Save, Monitor, MonitorPlay } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';
import { TemplatePicker } from '../components/TemplatePicker';
import { SaveToLibraryForm } from '../components/SaveToLibraryForm';
import { Terminal } from '../components/Terminal';

export function PlaywrightConfigStep() {
  const ctx = useIntegrate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section 1: Script Editor */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} style={{ color: '#fff' }} />
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Playwright Script</div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 5, position: 'relative', marginBottom: 24, border: '1px solid var(--border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ position: 'absolute', top: 5, bottom: 5, width: 'calc(50% - 5px)', left: ctx.scriptMode === 'data' ? 5 : '50%', background: 'var(--bg-card)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)', border: '1px solid var(--border)', transition: 'left 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)' }} />
            <button onClick={() => ctx.setScriptMode('data')} style={{ flex: 1, padding: '14px 16px', position: 'relative', zIndex: 1, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: ctx.scriptMode === 'data' ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} style={{ color: ctx.scriptMode === 'data' ? 'var(--accent)' : 'inherit', transition: 'color 0.3s ease' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Data Mode</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: ctx.scriptMode === 'data' ? 0.8 : 0.6 }}>Returns full JSON extraction</span>
            </button>
            <button onClick={() => ctx.setScriptMode('token')} style={{ flex: 1, padding: '14px 16px', position: 'relative', zIndex: 1, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: ctx.scriptMode === 'token' ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} style={{ color: ctx.scriptMode === 'token' ? 'var(--accent)' : 'inherit', transition: 'color 0.3s ease' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Token Mode</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: ctx.scriptMode === 'token' ? 0.8 : 0.6 }}>Captures auth token for APIs</span>
            </button>
          </div>

          <TemplatePicker templateType="script" />

          {/* Code Editor */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, right: 14, fontSize: '0.625rem', color: '#4b5563', fontFamily: 'monospace', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, zIndex: 1 }}>Node.js ESM</div>
            <textarea value={ctx.scriptContent} onChange={e => ctx.setScriptContent(e.target.value)} style={{ width: '100%', minHeight: 340, boxSizing: 'border-box', fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace", fontSize: '0.8125rem', background: '#0d1117', color: '#c9d1d9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 18px', lineHeight: 1.7, resize: 'vertical', letterSpacing: '0.01em' }} spellCheck={false} />
          </div>
        </div>
      </div>

      {/* Section 2: Credentials */}
      {ctx.showCreds && (
        <div ref={ctx.credentialsContainerRef} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Service Credentials</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Injected as environment variables at runtime · AES-256-GCM encrypted</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8125rem' }}>Email / Username</label>
              <input className="form-input" value={ctx.credEmail} onChange={e => ctx.setCredEmail(e.target.value)} placeholder="your@email.com" type="email" autoComplete="off" style={{ fontSize: '0.875rem', padding: '10px 14px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8125rem' }}>Password</label>
              <input className="form-input" value={ctx.credPassword} onChange={e => ctx.setCredPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="new-password" style={{ fontSize: '0.875rem', padding: '10px 14px' }} />
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Terminal Output */}
      <Terminal lines={ctx.terminalLines} running={ctx.running} needsInput={ctx.needsInput} otpInput={ctx.otpInput} onOtpChange={ctx.setOtpInput} onSendInput={() => ctx.sendInput(ctx.otpInput)} terminalRef={ctx.terminalRef} />

      {/* Action Bar */}
      <div ref={ctx.actionBarRef} style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 4, scrollMarginBottom: '40px' }}>
        <button onClick={ctx.toggleCreds} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', background: ctx.showCreds ? 'var(--bg-secondary)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: ctx.showCreds ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
          <Key size={18} /> Credentials
        </button>
        <button onClick={() => ctx.setShowBrowser(!ctx.showBrowser)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', background: ctx.showBrowser ? 'rgba(74, 222, 128, 0.1)' : 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: ctx.showBrowser ? '#4ade80' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
          {ctx.showBrowser ? <MonitorPlay size={18} /> : <Monitor size={18} />} {ctx.showBrowser ? 'Visible Browser' : 'Headless'}
        </button>
        <button onClick={ctx.running ? ctx.stopScript : ctx.runPlaywrightScript} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 34px', background: ctx.running ? '#ef4444' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', boxShadow: ctx.running ? 'none' : '0 6px 16px rgba(79, 70, 229, 0.35)', transition: 'all 0.15s cubic-bezier(0.25, 1, 0.5, 1)' }}>
          {ctx.running ? <Square size={18} /> : <Play size={18} />}
          {ctx.running ? 'Stop Script' : 'Run Script'}
        </button>
      </div>

      {/* Script Result */}
      {ctx.scriptResult && !ctx.running && (
        <div ref={ctx.resultRef} style={{ background: 'var(--bg-card)', border: '1px solid rgba(74, 222, 128, 0.25)', borderRadius: 'var(--radius-lg)', padding: 24, scrollMarginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.875rem', fontWeight: 700, color: '#4ade80' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(74, 222, 128, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={16} style={{ color: '#4ade80' }} />
            </div>
            {ctx.scriptMode === 'token' ? 'Token Captured Successfully' : 'Script Completed — Output Received'}
          </div>
          {ctx.scriptMode === 'token' && ctx.capturedToken ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#0d1117', borderRadius: 10, border: '1px solid rgba(74, 222, 128, 0.15)' }}>
              <Key size={14} style={{ color: '#4ade80', flexShrink: 0 }} />
              <code style={{ flex: 1, color: '#d1fae5', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{ctx.capturedToken.slice(0, 60)}...</code>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>{ctx.capturedToken.length} chars</span>
            </div>
          ) : (
            <pre style={{ background: '#0d1117', color: '#d1fae5', padding: 16, borderRadius: 10, fontSize: '0.75rem', margin: 0, overflow: 'auto', maxHeight: 180, lineHeight: 1.6, border: '1px solid rgba(255,255,255,0.06)' }}>{JSON.stringify(ctx.scriptResult, null, 2)}</pre>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={() => { ctx.setShowSaveScript(true); ctx.setSaveScriptPlatform(ctx.name || ''); ctx.setSaveScriptModeType(ctx.scriptMode); setTimeout(() => ctx.saveScriptContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100); }} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
              <Save size={15} /> Save Script to Library
            </button>
            <button className="btn btn-primary" onClick={() => ctx.setStep(ctx.getNextStep())} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', padding: '10px 22px' }}>
              {ctx.scriptMode === 'token' ? 'Next: Add API Curls' : 'Next: Map Fields'} <ArrowRight size={15} />
            </button>
          </div>

          {ctx.showSaveScript && <SaveToLibraryForm type="script" scrollRef={ctx.saveScriptContainerRef} />}
        </div>
      )}
    </div>
  );
}
