/* ══════════════════════════════════════════════════════
   SubTrack — Integrate Context (Composer)
   Composes useFormFields (local) + useIntegrationEngine.
   Owns cross-cutting: edit loading, handleSave, applyTemplate.
   ══════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGetSubscription, apiCreateSubscription, apiUpdateSubscription, apiCreateSecretsBatch, apiCheckSecretExists, apiGetDropdownOptions } from '@/api/client';
import type { DropdownOptions } from '@/api/client';
import { useToast } from '@/components/Toast';
import { flattenPaths } from '@/utils/helpers';
import type { InvoiceRecord } from '@/types';
import type { IntegrationType, ScriptMode } from './integrate.types';
import { useIntegrationEngine } from './hooks/useIntegrationEngine';
import { buildSubscriptionPayload, buildApiPayload } from './services/payloadBuilder';

// ── Local hook: form field declarations (not reusable, just organized) ──

function useFormFields() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [currency, setCurrency] = useState('INR');
  const [billingCycle, setBillingCycle] = useState('one-time');
  const [color, setColor] = useState('#4F46E5');
  const [notes, setNotes] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [department, setDepartment] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [peopleUsing, setPeopleUsing] = useState<string[]>([]);
  const [planName, setPlanName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [clientName, setClientName] = useState('');
  const [platform, setPlatform] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [renewDate, setRenewDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [ddOptions, setDdOptions] = useState<DropdownOptions>({
    clients: [], serviceTypes: [], departments: [], billingCycles: [],
    categories: [], paymentMethods: [], platforms: [],
  });

  useEffect(() => {
    apiGetDropdownOptions().then(setDdOptions).catch(e => console.error('Failed to load dropdown options', e));
  }, []);

  return {
    name, setName, category, setCategory, currency, setCurrency,
    billingCycle, setBillingCycle, color, setColor, notes, setNotes,
    accountLabel, setAccountLabel, department, setDepartment,
    ownerName, setOwnerName, peopleUsing, setPeopleUsing,
    planName, setPlanName, serviceType, setServiceType,
    clientName, setClientName, platform, setPlatform,
    costAmount, setCostAmount, creditsAmount, setCreditsAmount,
    startDate, setStartDate, endDate, setEndDate,
    renewDate, setRenewDate, autoRenew, setAutoRenew,
    invoices, setInvoices, ddOptions,
  };
}

// ── Context ─────────────────────────────────────────

type IntegrateContextType = ReturnType<typeof useFormFields> & ReturnType<typeof useIntegrationEngine> & {
  loading: boolean; saving: boolean; navigate: ReturnType<typeof useNavigate>;
  activeResponse: Record<string, unknown> | null;
  responsePaths: { path: string; value: unknown }[];
  handleSave: () => Promise<void>;
  applyTemplate: (templateId: string) => void;
};

const IntegrateContext = createContext<IntegrateContextType | null>(null);

export function useIntegrate() {
  const ctx = useContext(IntegrateContext);
  if (!ctx) throw new Error('useIntegrate must be used within IntegrateProvider');
  return ctx;
}

// ── Provider (the composer) ─────────────────────────

export function IntegrateProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { showToast } = useToast();

  const form = useFormFields();
  const engine = useIntegrationEngine();

  // ── Derived: active response ──────────────────────
  const getActiveResponse = (): Record<string, unknown> | null => {
    if (engine.method === 'curl') return engine.apiResponse;
    if (engine.method === 'playwright' && engine.scriptMode === 'data') return engine.scriptResult;
    if (engine.method === 'playwright' && engine.scriptMode === 'token') {
      const allRes: Record<string, unknown> = {};
      for (const req of engine.curlRequests) { if (req.response) allRes[req.label || req.id] = req.response; }
      return Object.keys(allRes).length > 0 ? allRes : null;
    }
    return null;
  };
  const activeResponse = getActiveResponse();
  const responsePaths = activeResponse ? flattenPaths(activeResponse) : [];

  // ── Cross-cutting: apply template ─────────────────
  const applyTemplate = (templateId: string) => {
    engine.setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = engine.savedTemplates.find(t => t.id === templateId);
    if (!tmpl) return;
    
    if (tmpl.template_type === 'api') {
      if (engine.method === 'curl') {
        engine.setCurlText(tmpl.script_content);
        engine.setApiResponse(null);
      } else if (engine.method === 'playwright' && engine.scriptMode === 'token') {
        engine.addCurlRequest(tmpl.name, tmpl.script_content);
        // Reset dropdown so user can select another if they want
        setTimeout(() => engine.setSelectedTemplateId(''), 50);
      }
    } else if (tmpl.template_type === 'script') {
      engine.setScriptContent(tmpl.script_content);
      engine.setScriptMode(tmpl.script_mode);
    }
    
    if (!form.name.trim() && tmpl.platform) form.setName(tmpl.platform);
  };

  // ── Edit-mode loading ─────────────────────────────
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    const loadSub = async () => {
      try {
        const sub = await apiGetSubscription(editId);
        // Hydrate form
        form.setName(sub.name); form.setCategory(sub.category); form.setCurrency(sub.currency);
        form.setBillingCycle(sub.billingCycle); form.setColor(sub.color); form.setNotes(sub.notes);
        form.setAccountLabel(sub.account_label || ''); form.setPlatform(sub.platform || '');
        form.setDepartment(sub.department || ''); form.setOwnerName(sub.owner || '');
        form.setPeopleUsing(sub.peopleUsing ? sub.peopleUsing.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        form.setPlanName(sub.planName || ''); form.setServiceType(sub.serviceType || '');
        form.setClientName(sub.client || '');
        form.setCostAmount(sub.cost?.amount ? String(sub.cost.amount) : '');
        form.setCreditsAmount(sub.credits?.balance != null ? String(sub.credits.balance) : '');
        form.setStartDate(sub.dates?.startDate || ''); form.setEndDate(sub.dates?.endDate || '');
        form.setRenewDate(sub.dates?.nextRenewal || ''); form.setAutoRenew(sub.autoRenew || false);
        form.setInvoices((sub.invoices as InvoiceRecord[]) || []);
        // Hydrate engine
        const int = sub.integration || {};
        const intType = (int.type as IntegrationType) || 'manual';
        engine.setMethod(intType);
        if (intType === 'curl') {
          engine.setCurlText(int.curlCommand as string || '');
          engine.setApiResponse(int.lastResponse as Record<string, unknown> || null);
          const hasApiKey = await apiCheckSecretExists(editId, 'API_KEY');
          engine.setApiKeyStored(hasApiKey);
        } else if (intType === 'playwright') {
          engine.setScriptContent(int.scriptContent as string || '');
          engine.setScriptMode((int.scriptMode as ScriptMode) || 'data');
          if (int.requests) engine.setCurlRequests((int.requests as any[]).map(r => ({ id: r.id, label: r.label, curlText: r.curlCommand, response: r.lastResponse, testing: false })));
          if ((int.scriptMode as ScriptMode) === 'token') { const hasApiKey = await apiCheckSecretExists(editId, 'API_KEY'); engine.setApiKeyStored(hasApiKey); }
        }
        if (sub.customData) {
          const cd = sub.customData as any;
          if (cd._cardConfig?.blocks) engine.setCardBlocks(cd._cardConfig.blocks);
          engine.setCustomFields(Object.keys(cd).filter(k => !k.startsWith('_')));
        }
        if (int.fieldMapping) engine.setFieldMapping(int.fieldMapping as Record<string, string>);
        engine.setStep('map');
      } catch { showToast('Failed to load subscription for editing', 'error'); navigate('/'); }
      finally { setLoading(false); }
    };
    loadSub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ── Save (uses payloadBuilder) ────────────────────
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Subscription name is required', 'warning'); return; }
    setSaving(true);
    try {
      const sub = buildSubscriptionPayload({
        ...form, method: engine.method,
        curlText: engine.curlText, apiResponse: engine.apiResponse,
        scriptContent: engine.scriptContent, scriptMode: engine.scriptMode,
        curlRequests: engine.curlRequests, scriptResult: engine.scriptResult,
        fieldMapping: engine.fieldMapping, cardBlocks: engine.cardBlocks,
        activeResponse,
      });
      const apiPayload = buildApiPayload(sub);

      let subId = editId;
      if (editId) {
        await apiUpdateSubscription(editId, apiPayload);
        showToast(`"${form.name}" updated successfully!`, 'success');
      } else {
        const created = await apiCreateSubscription(apiPayload);
        subId = created.id;
        if (engine.method === 'playwright' && engine.credEmail && engine.credPassword) {
          try { await apiCreateSecretsBatch([{ key_name: 'EMAIL', value: engine.credEmail }, { key_name: 'PASSWORD', value: engine.credPassword }], created.id); }
          catch { showToast('Subscription saved but credentials failed to store', 'warning'); }
        }
        showToast(`"${form.name}" added successfully!`, 'success');
      }
      if (engine.apiKeyInput && subId) {
        try { await apiCreateSecretsBatch([{ key_name: 'API_KEY', value: engine.apiKeyInput }], subId); engine.setApiKeyInput(''); }
        catch { showToast('Subscription saved but API Key failed to store', 'warning'); }
      }
      navigate('/');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  // ── Provide everything ────────────────────────────
  return (
    <IntegrateContext.Provider value={{
      ...form, ...engine,
      loading, saving, navigate,
      activeResponse, responsePaths,
      handleSave, applyTemplate,
    }}>
      {children}
    </IntegrateContext.Provider>
  );
}
