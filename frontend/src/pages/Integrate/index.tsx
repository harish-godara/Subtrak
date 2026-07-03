/* ══════════════════════════════════════════════════════
   SubTrack — Integrate Page (Orchestrator)
   Lean entry point: Context + Step Switcher.
   ══════════════════════════════════════════════════════ */

import { IntegrateProvider, useIntegrate } from './IntegrateContext';
import { StepNavigation } from './components/StepNavigation';
import { MethodStep } from './steps/MethodStep';
import { InfoStep } from './steps/InfoStep';
import { CurlConfigStep } from './steps/CurlConfigStep';
import { PlaywrightConfigStep } from './steps/PlaywrightConfigStep';
import { CurlsStep } from './steps/CurlsStep';
import { MapStep } from './steps/MapStep';

function IntegrateContent() {
  const { step, method, loading } = useIntegrate();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          Loading subscription...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
      {step !== 'method' && <StepNavigation />}
      {step === 'method' && <MethodStep />}
      {step === 'info' && <InfoStep />}
      {step === 'config' && method === 'curl' && <CurlConfigStep />}
      {step === 'config' && method === 'playwright' && <PlaywrightConfigStep />}
      {step === 'curls' && <CurlsStep />}
      {step === 'map' && <MapStep />}
    </div>
  );
}

export function IntegratePage() {
  return (
    <IntegrateProvider>
      <IntegrateContent />
    </IntegrateProvider>
  );
}
