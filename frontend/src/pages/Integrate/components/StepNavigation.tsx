/* ══════════════════════════════════════════════════════
   SubTrack — StepNavigation
   Header bar with back button, title, and progress dots.
   ══════════════════════════════════════════════════════ */

import { ArrowLeft } from 'lucide-react';
import { useIntegrate } from '../IntegrateContext';

export function StepNavigation() {
  const { step, setStep, method, scriptMode, getPrevStep } = useIntegrate();

  const title = step === 'info' ? 'Subscription Details'
    : step === 'config' ? (method === 'curl' ? 'API Configuration' : 'Playwright Script')
    : step === 'curls' ? 'API Requests'
    : step === 'map' ? 'Data Mapper'
    : 'Complete';

  const stepIds = [
    'info',
    method !== 'manual' ? 'config' : null,
    method === 'playwright' && scriptMode === 'token' ? 'curls' : null,
    method !== 'manual' ? 'map' : null,
  ].filter(Boolean) as string[];

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button onClick={() => setStep(getPrevStep())} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', textAlign: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, pointerEvents: 'none' }}>{title}</h1>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {stepIds.map(stepId => (
          <div key={stepId} style={{ width: 8, height: 8, borderRadius: '50%', background: stepId === step ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>
    </div>
  );
}
