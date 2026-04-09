/**
 * @clawgame/web - AI Settings Page
 * Configure AI model, provider, and view connection status.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Wifi, WifiOff, Cpu, Server, ArrowLeft, RefreshCw, Shield } from 'lucide-react';
import { useToast } from '../components/Toast';

interface AIHealth {
  status: string;
  service: string;
  model: string;
  features: string[];
  circuitOpen: boolean;
}

export function AISettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [health, setHealth] = useState<AIHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/ai/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-settings-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>⚙️ AI Settings</h1>
            <p>Model configuration and connection status</p>
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
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            </button>
          </div>

          {isLoading ? (
            <div className="settings-loading">Checking connection...</div>
          ) : health ? (
            <div className="settings-grid">
              <div className="settings-field">
                <label>Status</label>
                <span className={`status-badge ${health.status === 'connected' ? 'connected' : 'offline'}`}>
                  {health.status === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {health.status === 'connected' ? 'Connected' : 'Mock Mode'}
                </span>
              </div>
              <div className="settings-field">
                <label>Service</label>
                <span>{health.service}</span>
              </div>
              <div className="settings-field">
                <label>Model</label>
                <span className="model-badge">
                  <Cpu size={12} /> {health.model}
                </span>
              </div>
              <div className="settings-field">
                <label>Features</label>
                <div className="feature-tags">
                  {health.features.map(f => (
                    <span key={f} className="feature-tag">{f}</span>
                  ))}
                </div>
              </div>
              <div className="settings-field">
                <label>Circuit Breaker</label>
                <span className={`status-badge ${health.circuitOpen ? 'offline' : 'connected'}`}>
                  {health.circuitOpen ? 'Open (fallback mode)' : 'Closed (normal)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="settings-error">
              <WifiOff size={20} />
              <p>Cannot reach API server</p>
              <p className="hint">Make sure the backend is running at localhost:3000</p>
            </div>
          )}
        </div>

        {/* Configuration Guide */}
        <div className="settings-card">
          <div className="card-header">
            <Settings size={18} />
            <h3>Configuration</h3>
          </div>
          <div className="config-guide">
            <p>AI settings are configured via environment variables on the API server:</p>
            <table className="config-table">
              <thead>
                <tr><th>Variable</th><th>Description</th><th>Default</th></tr>
              </thead>
              <tbody>
                <tr><td><code>AI_API_URL</code></td><td>LLM API endpoint</td><td>z.ai API</td></tr>
                <tr><td><code>AI_API_KEY</code></td><td>API key for the provider</td><td>'' (mock mode)</td></tr>
                <tr><td><code>AI_MODEL</code></td><td>Model identifier</td><td>glm-4.5-flash</td></tr>
                <tr><td><code>USE_REAL_AI</code></td><td>Force real AI (1) or mock (0)</td><td>auto-detect</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Notice */}
        <div className="settings-card">
          <div className="card-header">
            <Shield size={18} />
            <h3>Security</h3>
          </div>
          <div className="config-guide">
            <p>API keys are stored as server-side environment variables and never exposed to the browser. The circuit breaker automatically switches to local fallback after consecutive failures to protect against API outages.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
