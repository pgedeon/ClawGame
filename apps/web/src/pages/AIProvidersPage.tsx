/**
 * @clawgame/web - AI Providers Settings Page
 *
 * P1 milestone 3 slice (docs/ai-provider-spec.md §Frontend):
 * - Provider cards: opencode / Anthropic / custom OpenAI-compatible (+ mock row)
 * - Per card: write-only masked key input, model dropdown fed by GET /api/ai/models,
 *   Test Connection via POST /api/ai/test, set-active toggle
 * - Fallback chain ordering (mock is implicit last, never stored)
 * - First-run guided prompt: when no provider is configured, offer one-time
 *   opencode key entry (https://opencode.ai/auth); skippable — mock fallback.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Cpu, Server, ArrowLeft, RefreshCw, Eye, EyeOff, Save,
  CheckCircle2, AlertCircle, Loader2, ArrowUp, ArrowDown, Zap,
} from 'lucide-react';
import '../ai-providers.css';

const API = (import.meta as any).env?.VITE_API_URL || '';
const FIRST_RUN_DISMISS_KEY = 'clawgame-ai-firstrun-dismissed';
const OPENCODE_AUTH_URL = 'https://opencode.ai/auth';

export type ProviderId = 'opencode' | 'anthropic' | 'openai-compat' | 'mock';

export interface ProviderEntry {
  id: ProviderId;
  available: boolean;
  configured: boolean;
  health: { ok: boolean; latencyMs?: number; error?: string } | null;
  note?: string;
}

export interface ProvidersResponse {
  activeProvider: ProviderId;
  fallbackChain: ProviderId[];
  useRealAI: boolean;
  providers: ProviderEntry[];
}

export interface ConfigResponse {
  provider: 'openrouter' | 'zai';
  apiUrl: string;
  model: string;
  apiKey: string;
  useRealAI: boolean;
  activeProvider: ProviderId;
  fallbackChain: ProviderId[];
  opencode: { apiKey: string; model: string };
  anthropic: { apiKey: string; model: string };
  openaiCompat: { baseUrl: string; apiKey: string; model: string };
}

export interface ModelOption {
  id: string;
  name: string;
  context_length?: number;
}

export interface TestResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  note?: string;
}

/** Card metadata for the three real providers (mock rendered separately). */
const PROVIDER_CARDS: Array<{ id: Exclude<ProviderId, 'mock'>; title: string; blurb: string }> = [
  { id: 'opencode', title: 'OpenCode Zen', blurb: 'Free-tier coding gateway — recommended first provider.' },
  { id: 'anthropic', title: 'Anthropic', blurb: 'Claude models. Key can be stored now; native adapter lands next milestone.' },
  { id: 'openai-compat', title: 'Custom OpenAI-compatible', blurb: 'Any OpenAI Chat Completions endpoint (OpenRouter, z.ai, local gateways…).' },
];

export function AIProvidersPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [providersRes, setProvidersRes] = useState<ProvidersResponse | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);

  // Write-only key drafts (never prefilled from masked readback)
  const [keyDrafts, setKeyDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [showKey, setShowKey] = useState<Partial<Record<ProviderId, boolean>>>({});

  // Models per provider
  const [modelsByProvider, setModelsByProvider] = useState<Partial<Record<ProviderId, ModelOption[]>>>({});
  const [modelsNotes, setModelsNotes] = useState<Partial<Record<ProviderId, string>>>({});
  const [selectedModels, setSelectedModels] = useState<Partial<Record<ProviderId, string>>>({});

  // Custom endpoint URL draft (openai-compat only)
  const [baseUrlDraft, setBaseUrlDraft] = useState('');

  // Test connection state per provider
  const [testing, setTesting] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [testResults, setTestResults] = useState<Partial<Record<ProviderId, TestResult>>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // First-run guided prompt
  const [firstRunDismissed, setFirstRunDismissed] = useState<boolean>(
    () => localStorage.getItem(FIRST_RUN_DISMISS_KEY) === '1',
  );
  const [firstRunKey, setFirstRunKey] = useState('');
  const [firstRunBusy, setFirstRunBusy] = useState(false);
  const [firstRunResult, setFirstRunResult] = useState<TestResult | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ai/providers`);
      const data: ProvidersResponse = await res.json();
      setProvidersRes(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ai/config`);
      const data: ConfigResponse = await res.json();
      setConfig(data);
      setSelectedModels({
        opencode: data.opencode.model || undefined,
        anthropic: data.anthropic.model || undefined,
        'openai-compat': data.openaiCompat.model || undefined,
      });
      setBaseUrlDraft(data.openaiCompat.baseUrl || '');
      return data;
    } catch {
      return null;
    }
  }, []);

  const loadModels = useCallback(async (provider: ProviderId) => {
    if (provider === 'mock') return;
    try {
      const res = await fetch(`${API}/api/ai/models?provider=${provider}`);
      const data = await res.json();
      if (!res.ok) {
        setModelsByProvider(prev => ({ ...prev, [provider]: [] }));
        setModelsNotes(prev => ({ ...prev, [provider]: data.error || 'Save a key to load models.' }));
        return;
      }
      setModelsByProvider(prev => ({ ...prev, [provider]: data.models || [] }));
      setModelsNotes(prev => ({ ...prev, [provider]: data.note }));
    } catch {
      setModelsByProvider(prev => ({ ...prev, [provider]: [] }));
      setModelsNotes(prev => ({ ...prev, [provider]: 'Failed to load models.' }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadProviders(), loadConfig()]);
      setLoading(false);
    })();
  }, [loadProviders, loadConfig]);

  useEffect(() => {
    if (!loading) {
      loadModels('opencode');
      loadModels('anthropic');
      loadModels('openai-compat');
    }
  }, [loading, loadModels]);

  const putConfig = useCallback(async (updates: Record<string, unknown>): Promise<ConfigResponse | null> => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`${API}/api/ai/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Save failed');
        return null;
      }
      setConfig(data);
      return data;
    } catch {
      setSaveError('Failed to reach API server');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const refreshAfterConfigChange = useCallback(async () => {
    await Promise.all([loadProviders(), loadConfig()]);
  }, [loadProviders, loadConfig]);

  const handleSaveCard = async (id: Exclude<ProviderId, 'mock'>) => {
    const updates: Record<string, unknown> = {};
    const key = keyDrafts[id];
    const model = selectedModels[id];
    if (id === 'openai-compat') {
      const section: Record<string, string> = {};
      if (key) section.apiKey = key;
      if (model !== undefined && model !== '') section.model = model;
      if (baseUrlDraft && baseUrlDraft !== config?.openaiCompat.baseUrl) section.baseUrl = baseUrlDraft;
      if (Object.keys(section).length > 0) updates.openaiCompat = section;
    } else {
      const section: Record<string, string> = {};
      if (key) section.apiKey = key;
      if (model !== undefined && model !== '') section.model = model;
      if (Object.keys(section).length > 0) updates[id] = section;
    }
    if (Object.keys(updates).length === 0) return;
    const ok = await putConfig(updates);
    if (ok) {
      setKeyDrafts(prev => ({ ...prev, [id]: '' }));
      await refreshAfterConfigChange();
      await loadModels(id);
    }
  };

  const handleSetActive = async (id: ProviderId) => {
    const ok = await putConfig({ activeProvider: id });
    if (ok) await refreshAfterConfigChange();
  };

  const handleTest = async (id: ProviderId) => {
    setTesting(prev => ({ ...prev, [id]: true }));
    setTestResults(prev => ({ ...prev, [id]: undefined }));
    try {
      const res = await fetch(`${API}/api/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      });
      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        [id]: { ok: Boolean(data.ok), latencyMs: data.latencyMs, error: data.error, note: data.note },
      }));
    } catch {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, error: 'Failed to reach API server' } }));
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  };

  const chain = config?.fallbackChain ?? [];
  const moveChainItem = async (index: number, dir: -1 | 1) => {
    const next = [...chain];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ok = await putConfig({ fallbackChain: next });
    if (ok) await refreshAfterConfigChange();
  };

  const anyConfigured = Boolean(
    providersRes?.providers.some(p => p.id !== 'mock' && p.configured),
  );
  const showFirstRun = !loading && !anyConfigured && !firstRunDismissed;

  const dismissFirstRun = () => {
    localStorage.setItem(FIRST_RUN_DISMISS_KEY, '1');
    setFirstRunDismissed(true);
  };

  const handleFirstRunSave = async () => {
    if (!firstRunKey.trim()) return;
    setFirstRunBusy(true);
    setFirstRunResult(null);
    try {
      const saved = await putConfig({ opencode: { apiKey: firstRunKey.trim() }, activeProvider: 'opencode' });
      if (saved) {
        setFirstRunKey('');
        await refreshAfterConfigChange();
        await loadModels('opencode');
        // One-shot connectivity check so the user knows it works before moving on.
        try {
          const res = await fetch(`${API}/api/ai/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'opencode' }),
          });
          const data = await res.json();
          setFirstRunResult({ ok: Boolean(data.ok), latencyMs: data.latencyMs, error: data.error });
        } catch {
          setFirstRunResult({ ok: false, error: 'Could not run connectivity test' });
        }
      }
    } finally {
      setFirstRunBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-providers-page">
        <div className="settings-content">
          <div className="settings-loading">Loading AI providers…</div>
        </div>
      </div>
    );
  }

  const renderKeyRow = (id: Exclude<ProviderId, 'mock'>) => {
    const masked = config
      ? id === 'opencode' ? config.opencode.apiKey : id === 'anthropic' ? config.anthropic.apiKey : config.openaiCompat.apiKey
      : '';
    return (
      <div className="prov-field">
        <label htmlFor={`key-${id}`}>API Key</label>
        <div className="hint" data-testid={`key-status-${id}`}>
          {masked ? `Stored: ${masked}` : 'No key stored'}
        </div>
        <div className="key-row">
          <input
            id={`key-${id}`}
            data-testid={`key-input-${id}`}
            type={showKey[id] ? 'text' : 'password'}
            value={keyDrafts[id] ?? ''}
            onChange={e => setKeyDrafts(prev => ({ ...prev, [id]: e.target.value }))}
            placeholder={masked ? 'Enter new key to replace' : 'Enter API key'}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn-icon"
            aria-label={showKey[id] ? 'Hide key' : 'Show key'}
            onClick={() => setShowKey(prev => ({ ...prev, [id]: !prev[id] }))}
          >
            {showKey[id] ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    );
  };

  const renderModelSelect = (id: Exclude<ProviderId, 'mock'>) => {
    const models = modelsByProvider[id] ?? [];
    const current = selectedModels[id]
      ?? (id === 'opencode' ? config?.opencode.model : id === 'anthropic' ? config?.anthropic.model : config?.openaiCompat.model)
      ?? '';
    return (
      <div className="prov-field">
        <label htmlFor={`model-${id}`}>Model</label>
        {models.length > 0 ? (
          <select
            id={`model-${id}`}
            data-testid={`model-select-${id}`}
            value={current}
            onChange={e => setSelectedModels(prev => ({ ...prev, [id]: e.target.value }))}
          >
            {!current && <option value="">— select a model —</option>}
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}{m.id !== m.name ? ` (${m.id})` : ''}
                {m.context_length ? ` — ${Math.round(m.context_length / 1000)}k ctx` : ''}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`model-${id}`}
            data-testid={`model-input-${id}`}
            value={current}
            onChange={e => setSelectedModels(prev => ({ ...prev, [id]: e.target.value }))}
            placeholder="model id"
          />
        )}
        {modelsNotes[id] && <div className="hint">{modelsNotes[id]}</div>}
      </div>
    );
  };

  const renderTestResult = (id: ProviderId) => {
    const result = testResults[id];
    if (!result) return null;
    if (result.ok) {
      return (
        <span className="test-result ok" data-testid={`test-result-${id}`}>
          <CheckCircle2 size={14} /> OK{result.latencyMs !== undefined ? ` · ${result.latencyMs}ms` : ''}{result.note ? ` · ${result.note}` : ''}
        </span>
      );
    }
    return (
      <span className="test-result fail" data-testid={`test-result-${id}`}>
        <AlertCircle size={14} /> {result.error || 'Test failed'}
      </span>
    );
  };

  return (
    <div className="ai-providers-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🔌 AI Providers</h1>
            <p>Bring your own key — pick an active provider and fallback order</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      </header>

      <div className="settings-content">

        {/* First-run guided prompt (ruling #2: guided key entry, mock fallback) */}
        {showFirstRun && (
          <section className="settings-card first-run-card" data-testid="first-run-prompt">
            <div className="card-header">
              <Zap size={18} />
              <h3>Welcome — activate real AI</h3>
            </div>
            <p className="first-run-copy">
              ClawGame runs in <strong>Mock mode</strong> until a provider is configured.
              Grab a free OpenCode key, paste it here, and you are set.
            </p>
            <p className="first-run-copy">
              Get your key at{' '}
              <a href={OPENCODE_AUTH_URL} target="_blank" rel="noopener noreferrer">{OPENCODE_AUTH_URL}</a>
            </p>
            {firstRunResult && (
              <div className="first-run-result">
                {firstRunResult.ok ? (
                  <span className="test-result ok"><CheckCircle2 size={14} /> OpenCode connected — real AI is live.</span>
                ) : (
                  <span className="test-result fail"><AlertCircle size={14} /> {firstRunResult.error || 'Key saved but test failed — check the OpenCode card below.'}</span>
                )}
              </div>
            )}
            <div className="first-run-actions">
              <input
                data-testid="firstrun-key-input"
                type="password"
                value={firstRunKey}
                onChange={e => setFirstRunKey(e.target.value)}
                placeholder="Paste your OpenCode key"
                autoComplete="off"
              />
              <button
                className="btn-primary"
                disabled={!firstRunKey.trim() || firstRunBusy || saving}
                onClick={handleFirstRunSave}
              >
                {firstRunBusy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save &amp; Activate
              </button>
              <button className="btn-secondary" onClick={dismissFirstRun} data-testid="firstrun-skip">
                Skip — use mock for now
              </button>
            </div>
          </section>
        )}

        {/* Provider cards */}
        {PROVIDER_CARDS.map(card => {
          const entry = providersRes?.providers.find(p => p.id === card.id);
          const isActive = config?.activeProvider === card.id;
          return (
            <section className="settings-card provider-card" key={card.id} data-testid={`card-${card.id}`}>
              <div className="card-header">
                <Server size={18} />
                <h3>{card.title}</h3>
                {isActive && <span className="badge active-badge">ACTIVE</span>}
                <span className={`badge ${entry?.configured ? 'ok-badge' : 'dim-badge'}`} data-testid={`configured-${card.id}`}>
                  {entry?.configured ? 'configured' : 'not configured'}
                </span>
              </div>
              <p className="prov-blurb">{card.blurb}</p>
              {entry?.note ? <p className="prov-note">{entry.note}</p> : null}

              <div className="prov-form">
                {renderKeyRow(card.id)}
                {card.id === 'openai-compat' && (
                  <div className="prov-field">
                    <label htmlFor="baseurl-openai-compat">Base URL</label>
                    <input
                      id="baseurl-openai-compat"
                      data-testid="baseurl-input-openai-compat"
                      value={baseUrlDraft}
                      onChange={e => setBaseUrlDraft(e.target.value)}
                      placeholder="https://…/v1/chat/completions"
                    />
                  </div>
                )}
                {renderModelSelect(card.id)}
                <div className="prov-actions">
                  <button
                    className="btn-primary"
                    disabled={saving || testing[card.id]}
                    onClick={() => handleSaveCard(card.id)}
                    data-testid={`save-${card.id}`}
                  >
                    <Save size={14} /> Save
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={testing[card.id]}
                    onClick={() => handleTest(card.id)}
                    data-testid={`test-${card.id}`}
                  >
                    {testing[card.id] ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Test Connection
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={saving || isActive}
                    onClick={() => handleSetActive(card.id)}
                    data-testid={`set-active-${card.id}`}
                  >
                    <Settings size={14} /> {isActive ? 'Active' : 'Set Active'}
                  </button>
                  {renderTestResult(card.id)}
                </div>
              </div>
            </section>
          );
        })}

        {/* Mock row */}
        <section className="settings-card provider-card mock-card" data-testid="card-mock">
          <div className="card-header">
            <Cpu size={18} />
            <h3>Mock AI</h3>
            {config?.activeProvider === 'mock' && <span className="badge active-badge">ACTIVE</span>}
            <span className="badge ok-badge">always available</span>
          </div>
          <p className="prov-blurb">Local simulated responses — implicit last fallback, no key needed.</p>
          <div className="prov-actions">
            <button
              className="btn-secondary"
              disabled={testing.mock}
              onClick={() => handleTest('mock')}
              data-testid="test-mock"
            >
              {testing.mock ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Test Connection
            </button>
            <button
              className="btn-secondary"
              disabled={config?.activeProvider === 'mock'}
              onClick={() => handleSetActive('mock')}
              data-testid="set-active-mock"
            >
              <Settings size={14} /> {config?.activeProvider === 'mock' ? 'Active' : 'Set Active'}
            </button>
            {renderTestResult('mock')}
          </div>
        </section>

        {/* Fallback chain */}
        <section className="settings-card" data-testid="fallback-chain">
          <div className="card-header">
            <Settings size={18} />
            <h3>Fallback Chain</h3>
          </div>
          <p className="prov-blurb">
            Tried in order after the active provider. Mock always answers last, even when unset.
          </p>
          {chain.length === 0 ? (
            <div className="hint">No fallbacks configured — failures go straight to mock.</div>
          ) : (
            <ul className="chain-list">
              {chain.map((id, i) => (
                <li key={id} className="chain-item" data-testid={`chain-item-${id}`}>
                  <span className="chain-order">{i + 1}</span>
                  <span className="chain-name">{id}</span>
                  <button aria-label={`Move ${id} up`} disabled={i === 0 || saving} onClick={() => moveChainItem(i, -1)} data-testid={`chain-up-${id}`}>
                    <ArrowUp size={14} />
                  </button>
                  <button aria-label={`Move ${id} down`} disabled={i === chain.length - 1 || saving} onClick={() => moveChainItem(i, 1)} data-testid={`chain-down-${id}`}>
                    <ArrowDown size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {saveError && (
          <div className="settings-error" role="alert"><AlertCircle size={16} /> {saveError}</div>
        )}
      </div>
    </div>
  );
}
