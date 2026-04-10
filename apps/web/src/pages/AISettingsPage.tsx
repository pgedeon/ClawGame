/**
 * @clawgame/web - AI Settings Page
 * Configure AI provider, model, API key — all persisted to .env
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Wifi, WifiOff, Cpu, Server, ArrowLeft, RefreshCw,
  Eye, EyeOff, Save, CheckCircle2, AlertCircle, Loader2, Search
} from 'lucide-react';
import { useToast } from '../components/Toast';
import '../ai-settings.css';

interface AIConfig {
  provider: 'openrouter' | 'zai';
  apiUrl: string;
  model: string;
  apiKey: string;
  useRealAI: boolean;
}

interface AIModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

const API = '';

export function AISettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [config, setConfig] = useState<AIConfig | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Editable fields
  const [provider, setProvider] = useState<'openrouter' | 'zai'>('zai');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ai/config`);
      const data = await res.json();
      setConfig(data);
      setProvider(data.provider || 'zai');
      setApiUrl(data.apiUrl || '');
      setApiKey(''); // Don't prefill masked key — user must re-enter to change
      setSelectedModel(data.model || '');
    } catch {
      showToast({ type: 'error', message: 'Failed to load AI config' });
    }
  }, [showToast]);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ai/health`);
      setHealth(await res.json());
    } catch {
      setHealth(null);
    }
  }, []);

  const loadModels = useCallback(async (prov: string) => {
    setModelsLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/models?provider=${prov}`);
      const data = await res.json();
      if (!res.ok) { showToast({ type: "error", message: data.error || `Failed to load models (${res.status})` }); setModels([]); return; }
      setModels(data.models || []);
    } catch {
      showToast({ type: 'error', message: 'Failed to load models' });
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadHealth()]);
      setLoading(false);
    })();
  }, [loadConfig, loadHealth]);

  useEffect(() => {
    loadModels(provider);
  }, [provider, loadModels]);

  const saveConfig = async (updates: Partial<AIConfig>) => {
    setSaving(Object.keys(updates)[0] || 'general');
    try {
      const res = await fetch(`${API}/api/ai/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data);
        if (updates.model) setSelectedModel(updates.model);
        showToast({ type: 'success', message: 'Settings saved' });
      } else {
        showToast({ type: 'error', message: data.error || 'Save failed' });
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(null);
    }
  };

  const handleProviderChange = (newProvider: 'openrouter' | 'zai') => {
    setProvider(newProvider);
    const url = newProvider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.z.ai/api/coding/paas/v4/chat/completions';
    setApiUrl(url);
  };

  const filteredModels = models.filter(m =>
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="ai-settings-page">
        <div className="settings-content">
          <div className="settings-loading">Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-settings-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>⚙️ AI Settings</h1>
            <p>Configure AI provider, model, and API key</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      </header>

      <div className="settings-content">

        {/* Connection Status */}
        <div className="settings-card">
          <div className="card-header">
            <Server size={18} />
            <h3>Connection Status</h3>
            <button className="btn-icon" onClick={loadHealth} title="Refresh">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
          {health ? (
            <div className="settings-grid">
              <div className="settings-field">
                <label>Status</label>
                <span className={`status-badge ${health.status === 'connected' || health.status === 'ok' ? 'connected' : 'offline'}`}>
                  {health.status === 'connected' || health.status === 'ok' ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {health.status === 'connected' ? 'Connected' : health.status === 'ok' ? 'OK' : 'Offline'}
                </span>
              </div>
              <div className="settings-field">
                <label>Service</label>
                <span>{health.service}</span>
              </div>
              <div className="settings-field">
                <label>Model</label>
                <span className="model-badge"><Cpu size={12} /> {health.model || config?.model}</span>
              </div>
              <div className="settings-field">
                <label>Features</label>
                <div className="feature-tags">
                  {(health.features || []).map((f: string) => (
                    <span key={f} className="feature-tag">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="settings-error">
              <WifiOff size={20} />
              <p>Cannot reach API server</p>
            </div>
          )}
        </div>

        {/* Provider */}
        <div className="settings-card">
          <div className="card-header">
            <Settings size={18} />
            <h3>Provider</h3>
          </div>
          <div className="settings-form">
            <div className="settings-form-group">
              <label>AI Provider</label>
              <select
                className="settings-select"
                value={provider}
                onChange={e => handleProviderChange(e.target.value as 'openrouter' | 'zai')}
              >
                <option value="zai">z.ai (GLM)</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div className="settings-form-group">
              <label>API URL</label>
              <input
                className="settings-input"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="settings-actions">
              {saving === 'apiUrl' && <span className="saving-indicator"><Loader2 size={12} className="spin" /> Saving...</span>}
              <button
                className="btn-primary"
                disabled={saving !== null}
                onClick={() => saveConfig({ provider, apiUrl })}
              >
                <Save size={14} /> Save Provider
              </button>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="settings-card">
          <div className="card-header">
            <Server size={18} />
            <h3>API Key</h3>
          </div>
          <div className="settings-form">
            <div className="settings-form-group">
              <label>
                {provider === 'openrouter' ? 'OpenRouter' : 'z.ai'} API Key
              </label>
              <div className="hint">
                {config?.apiKey
                  ? `Current: ${config.apiKey}`
                  : 'No API key configured'}
              </div>
              <div className="api-key-row">
                <input
                  className="settings-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={config?.apiKey ? 'Enter new key to replace' : 'Enter API key'}
                />
                <button className="btn-toggle-vis" onClick={() => setShowKey(!showKey)} type="button">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="settings-actions">
              {saving === 'apiKey' && <span className="saving-indicator"><Loader2 size={12} className="spin" /> Saving...</span>}
              <button
                className="btn-primary"
                disabled={!apiKey || saving !== null}
                onClick={() => saveConfig({ apiKey })}
              >
                <Save size={14} /> Save API Key
              </button>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="settings-card">
          <div className="card-header">
            <Cpu size={18} />
            <h3>Model</h3>
          </div>
          <div className="settings-form">
            <div className="settings-form-group">
              <label>Current Model</label>
              <span className="model-badge"><Cpu size={12} /> {selectedModel || config?.model}</span>
            </div>
            {modelsLoading ? (
              <div className="settings-loading">
                <Loader2 size={16} className="spin" /> Loading models...
              </div>
            ) : (
              <>
                {models.length > 10 && (
                  <div className="settings-form-group models-search">
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 8, top: 8, color: '#64748b' }} />
                      <input
                        className="settings-input"
                        style={{ paddingLeft: 28 }}
                        placeholder="Search models..."
                        value={modelSearch}
                        onChange={e => setModelSearch(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="settings-form-group">
                  <label>Select Model</label>
                  <select
                    className="settings-select models-list"
                    size={Math.min(filteredModels.length, 8)}
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                  >
                    {filteredModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id}){m.context_length ? ` — ${Math.round(m.context_length / 1000)}k ctx` : ''}
                      </option>
                    ))}
                  </select>
                  {filteredModels.length === 0 && !modelsLoading && (
                    <div className="hint">No models available. Check your API key and provider settings.</div>
                  )}
                </div>
              </>
            )}
            <div className="settings-actions">
              {saving === 'model' && <span className="saving-indicator"><Loader2 size={12} className="spin" /> Saving...</span>}
              <button
                className="btn-primary"
                disabled={!selectedModel || saving !== null}
                onClick={() => saveConfig({ model: selectedModel })}
              >
                <Save size={14} /> Save Model
              </button>
            </div>
          </div>
        </div>

        {/* Enable / Disable Real AI */}
        <div className="settings-card">
          <div className="card-header">
            <Settings size={18} />
            <h3>AI Mode</h3>
          </div>
          <div className="settings-form">
            <div className="settings-form-group">
              <label>Use Real AI</label>
              <div className="hint">
                When enabled, AI commands use the configured provider. When disabled, returns simulated responses.
              </div>
              <select
                className="settings-select"
                value={config?.useRealAI ? 'true' : 'false'}
                onChange={e => saveConfig({ useRealAI: e.target.value === 'true' })}
              >
                <option value="true">Real AI (requires API key)</option>
                <option value="false">Mock / Preview Mode</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
