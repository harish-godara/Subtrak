/* ══════════════════════════════════════════════════════
   SubTrack — Integrate: Integration Engine
   Curl, Playwright, Templates, Mapping, Save-to-Library.
   Form fields live in IntegrateContext (useFormFields).
   ══════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  executeCurl, executeSecureCurl, runScriptWithCreds,
  apiGetTemplates, apiCreateTemplate,
} from '@/api/client';
import { useToast } from '@/components/Toast';
import { parseCurl } from '@/utils/helpers';
import type { ScriptTemplate } from '@/types';
import type { IntegrationType, ScriptMode, Step, CardBlock, CurlRequest } from '../integrate.types';
import { DEFAULT_SCRIPT } from '@/utils/constants';
import { useWebSocket } from './useWebSocket';

export function useIntegrationEngine() {
  const { showToast } = useToast();
  const ws = useWebSocket();

  // ── Navigation ──────────────────────────────────────
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<IntegrationType>('manual');

  const selectMethod = (m: IntegrationType) => { setMethod(m); setStep('info'); };

  const getNextStep = (): Step => {
    if (method === 'manual') return 'done';
    if (method === 'curl') return 'config';
    if (step === 'info') return 'config';
    if (step === 'config') return scriptMode === 'token' ? 'curls' : 'map';
    if (step === 'curls') return 'map';
    return 'map';
  };

  const getPrevStep = (): Step => {
    if (step === 'method') return 'method';
    if (step === 'info') return 'method';
    if (step === 'config') return 'info';
    if (step === 'curls') return 'config';
    if (step === 'map') return method === 'playwright' ? (scriptMode === 'token' ? 'curls' : 'config') : 'config';
    return 'info';
  };

  // ── Templates ───────────────────────────────────────
  const [savedTemplates, setSavedTemplates] = useState<ScriptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    apiGetTemplates().then(setSavedTemplates).catch(() => {});
  }, []);

  const refreshTemplates = useCallback(() => {
    apiGetTemplates().then(setSavedTemplates).catch(() => {});
  }, []);

  // ── Curl ─────────────────────────────────────────────
  const [curlText, setCurlText] = useState('');
  const [apiResponse, setApiResponse] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStored, setApiKeyStored] = useState(false);

  // Shared curl execution helper — used by both simple curl and token-mode curls
  const executeCurlTest = async (
    rawCurlText: string,
    opts: { secure?: boolean; tokenReplace?: string; onSuccess: (body: Record<string, unknown>) => void; onFinally: () => void }
  ) => {
    if (!rawCurlText.trim()) { showToast('Paste a curl command first', 'warning'); return; }
    try {
      const config = parseCurl(rawCurlText);
      if (opts.tokenReplace) {
        config.headers = config.headers || {};
        for (const [k, v] of Object.entries(config.headers)) config.headers[k] = v.replace(/\{\{TOKEN\}\}/g, opts.tokenReplace);
        config.url = config.url.replace(/\{\{TOKEN\}\}/g, opts.tokenReplace);
        if (config.body) config.body = config.body.replace(/\{\{TOKEN\}\}/g, opts.tokenReplace);
      }
      const secretsPayload = opts.secure && apiKeyInput ? { API_KEY: apiKeyInput } : undefined;
      const result = (opts.secure ? await executeSecureCurl(config, secretsPayload) : await executeCurl(config)) as { success: boolean; body: unknown };
      if (result.success && result.body && typeof result.body === 'object') {
        opts.onSuccess(result.body as Record<string, unknown>);
        showToast('API test successful!', 'success');
      } else showToast('API returned non-JSON or failed', 'error');
    } catch { showToast('Failed to execute curl', 'error'); }
    finally { opts.onFinally(); }
  };

  const testCurl = async () => {
    setTesting(true);
    await executeCurlTest(curlText, {
      secure: true,
      onSuccess: body => setApiResponse(body),
      onFinally: () => setTesting(false),
    });
  };

  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
  const [scriptMode, setScriptMode] = useState<ScriptMode>('data');
  const [credEmail, setCredEmail] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  const credentialsContainerRef = useRef<HTMLDivElement>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const toggleCreds = () => {
    const isOpening = !showCreds;
    setShowCreds(isOpening);
    if (isOpening) setTimeout(() => credentialsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const runPlaywrightScript = useCallback(async () => {
    if (!scriptContent.trim()) { showToast('Script content is empty', 'warning'); return; }
    const requiresCreds = scriptContent.toUpperCase().includes('SUBTRACK_EMAIL') || scriptContent.toUpperCase().includes('SUBTRACK_PASSWORD');
    if (requiresCreds && (!credEmail.trim() || !credPassword.trim())) {
      setShowCreds(true);
      showToast('This script requires an Email and Password to run', 'warning');
      setTimeout(() => credentialsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }
    setTimeout(() => actionBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
    try {
      const runData = await runScriptWithCreds({
        scriptContent,
        credentials: { EMAIL: credEmail, PASSWORD: credPassword },
        scriptMode: scriptMode === 'token' ? 'token' : 'data',
        showBrowser,
      });
      if (!runData.success) throw new Error('Failed to start script');
      ws.connect(runData.execution_id, runData.script_id);
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed to run script', 'error'); }
  }, [scriptContent, credEmail, credPassword, scriptMode, showToast, ws]);

  // ── Token-mode Curls ────────────────────────────────
  const [curlRequests, setCurlRequests] = useState<CurlRequest[]>([]);

  const addCurlRequest = (presetLabel?: string, presetCurlText?: string) => {
    setCurlRequests(prev => [...prev, {
      id: `req_${Date.now()}`, label: presetLabel || `API Request ${prev.length + 1}`,
      curlText: presetCurlText || '', response: null, testing: false,
    }]);
  };
  const removeCurlRequest = (id: string) => setCurlRequests(prev => prev.filter(r => r.id !== id));
  const updateCurlRequest = (id: string, field: Partial<CurlRequest>) => setCurlRequests(prev => prev.map(r => r.id === id ? { ...r, ...field } : r));

  const testTokenCurl = async (reqId: string) => {
    const req = curlRequests.find(r => r.id === reqId);
    if (!req) return;
    updateCurlRequest(reqId, { testing: true });
    await executeCurlTest(req.curlText, {
      tokenReplace: ws.capturedToken || undefined,
      onSuccess: body => updateCurlRequest(reqId, { response: body, testing: false }),
      onFinally: () => updateCurlRequest(reqId, { testing: false }),
    });
  };

  // ── Field Mapping ───────────────────────────────────
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [cardBlocks, setCardBlocks] = useState<CardBlock[]>([
    { id: 'b_balance', type: 'balance', label: 'Credit Balance' },
    { id: 'b_dates', type: 'dates', label: 'Billing Period' },
  ]);

  // ── Save to Library ─────────────────────────────────
  const [showSaveScript, setShowSaveScript] = useState(false);
  const [saveScriptName, setSaveScriptName] = useState('');
  const [saveScriptPlatform, setSaveScriptPlatform] = useState('');
  const [saveScriptDesc, setSaveScriptDesc] = useState('');
  const [saveScriptModeType, setSaveScriptModeType] = useState<ScriptMode>('data');
  const [savingScript, setSavingScript] = useState(false);
  const [showSaveCurl, setShowSaveCurl] = useState<string | null>(null);
  const [saveCurlName, setSaveCurlName] = useState('');
  const [saveCurlPlatform, setSaveCurlPlatform] = useState('');
  const [saveCurlDesc, setSaveCurlDesc] = useState('');
  const [savingCurl, setSavingCurl] = useState(false);

  const saveScriptContainerRef = useRef<HTMLDivElement>(null);
  const saveCurlContainerRef = useRef<HTMLDivElement>(null);
  const saveSimpleCurlContainerRef = useRef<HTMLDivElement>(null);

  // Unified save-to-library — handles both script and curl templates
  const saveToLibrary = async (type: 'script' | 'api') => {
    const isScript = type === 'script';
    const name = isScript ? saveScriptName : saveCurlName;
    if (!name.trim()) { showToast('Name is required', 'warning'); return; }

    let content = '';
    if (isScript) {
      content = scriptContent;
    } else {
      if (showSaveCurl === 'simple') content = curlText;
      else { const req = curlRequests.find(r => r.id === showSaveCurl); if (!req) return; content = req.curlText; }
      if (!content.trim()) { showToast('Curl content is empty', 'warning'); return; }
    }

    const setSaving = isScript ? setSavingScript : setSavingCurl;
    setSaving(true);
    try {
      await apiCreateTemplate({
        name,
        platform: isScript ? saveScriptPlatform : saveCurlPlatform,
        description: isScript ? saveScriptDesc : saveCurlDesc,
        script_content: content,
        script_mode: isScript ? saveScriptModeType : 'data',
        credential_fields: [],
        template_type: type,
        is_global: false,
      });
      showToast(`${isScript ? 'Script' : 'API curl'} saved to library!`, 'success');
      if (isScript) { setShowSaveScript(false); setSaveScriptName(''); setSaveScriptPlatform(''); setSaveScriptDesc(''); }
      else { setShowSaveCurl(null); setSaveCurlName(''); setSaveCurlPlatform(''); setSaveCurlDesc(''); }
      refreshTemplates();
    } catch { showToast(`Failed to save ${type}`, 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveScriptToLibrary = () => saveToLibrary('script');
  const handleSaveCurlToLibrary = () => saveToLibrary('api');

  // ═══════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════

  return {
    // Navigation
    step, setStep, method, setMethod, selectMethod, getNextStep, getPrevStep,
    // Curl
    curlText, setCurlText, apiResponse, setApiResponse, testing, testCurl,
    apiKeyInput, setApiKeyInput, showApiKey, setShowApiKey, apiKeyStored, setApiKeyStored,
    // Playwright
    scriptContent, setScriptContent, scriptMode, setScriptMode,
    credEmail, setCredEmail, credPassword, setCredPassword,
    showCreds, toggleCreds, otpInput, setOtpInput,
    showBrowser, setShowBrowser,
    runPlaywrightScript, stopScript: ws.stop, sendInput: ws.sendInput,
    // WebSocket state
    running: ws.running, needsInput: ws.needsInput, terminalLines: ws.terminalLines,
    scriptResult: ws.scriptResult, capturedToken: ws.capturedToken,
    terminalRef: ws.terminalRef,
    // Templates
    savedTemplates, selectedTemplateId, setSelectedTemplateId,
    // Token curls
    curlRequests, setCurlRequests, addCurlRequest, removeCurlRequest, updateCurlRequest, testTokenCurl,
    // Field mapping
    fieldMapping, setFieldMapping, customFields, setCustomFields, cardBlocks, setCardBlocks,
    // Save to library
    showSaveScript, setShowSaveScript, saveScriptName, setSaveScriptName,
    saveScriptPlatform, setSaveScriptPlatform, saveScriptDesc, setSaveScriptDesc,
    saveScriptModeType, setSaveScriptModeType, savingScript, handleSaveScriptToLibrary,
    showSaveCurl, setShowSaveCurl, saveCurlName, setSaveCurlName,
    saveCurlPlatform, setSaveCurlPlatform, saveCurlDesc, setSaveCurlDesc,
    savingCurl, handleSaveCurlToLibrary,
    // Refs
    credentialsContainerRef, actionBarRef, resultRef,
    saveScriptContainerRef, saveCurlContainerRef, saveSimpleCurlContainerRef,
  };
}
