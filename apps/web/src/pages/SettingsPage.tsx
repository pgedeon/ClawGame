import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Keyboard, Cpu, Info, ChevronRight, Server, Palette } from 'lucide-react';
import {
  getRequestedPreviewRuntimeKind,
  listPreviewRuntimeDescriptors,
  resolvePreviewRuntimeSelection,
  setRequestedPreviewRuntimeKind,
  type PreviewRuntimeKind,
} from '../runtime';

type Theme = 'dark' | 'light' | 'system';

interface ShortcutItem {
  keys: string[];
  description: string;
}

const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  { keys: ['⌘/Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['⌘/Ctrl', 'S'], description: 'Save current project' },
  { keys: ['⌘/Ctrl', 'W'], description: 'Close current tab' },
  { keys: ['⌘/Ctrl', 'Z'], description: 'Undo' },
  { keys: ['⌘/Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['⌘/Ctrl', 'P'], description: 'Preview game' },
  { keys: ['⌘/Ctrl', 'B'], description: 'Toggle sidebar' },
  { keys: ['⌘/Ctrl', '/'], description: 'Toggle code comments' },
  { keys: ['F5'], description: 'Quick save game state' },
  { keys: ['Escape'], description: 'Close panel / menu' },
];

const AI_MODELS = [
  { value: 'glm-4.5-flash', label: 'GLM-4.5 Flash (Default)' },
  { value: 'glm-5', label: 'GLM-5' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
];

const PREVIEW_RUNTIMES = listPreviewRuntimeDescriptors();

export function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('clawgame-theme') as Theme) || 'system';
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('clawgame-ai-model') || 'glm-4.5-flash';
  });
  const [autoSuggestions, setAutoSuggestions] = useState<boolean>(() => {
    return localStorage.getItem('clawgame-auto-suggestions') !== 'false';
  });
  const [apiUrl, setApiUrl] = useState<string>(() => {
    return localStorage.getItem('clawgame-api-url') || 'http://localhost:3000';
  });
  const [comfyuiUrl, setComfyuiUrl] = useState<string>(() => {
    return localStorage.getItem('clawgame-comfyui-url') || 'http://localhost:8188';
  });
  const [previewRuntime, setPreviewRuntime] = useState<PreviewRuntimeKind>(() => {
    return getRequestedPreviewRuntimeKind();
  });
  const [healthVersion, setHealthVersion] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const runtimeSelection = resolvePreviewRuntimeSelection({
    getItem: (key) => key === 'clawgame-preview-runtime' ? previewRuntime : null,
  });

  // Apply theme changes
  useEffect(() => {
    localStorage.setItem('clawgame-theme', theme);
    applyTheme(theme);
  }, [theme]);

  // Persist AI model
  useEffect(() => {
    localStorage.setItem('clawgame-ai-model', aiModel);
  }, [aiModel]);

  // Persist auto-suggestions
  useEffect(() => {
    localStorage.setItem('clawgame-auto-suggestions', String(autoSuggestions));
  }, [autoSuggestions]);

  // Persist API URL
  useEffect(() => {
    localStorage.setItem('clawgame-api-url', apiUrl);
  }, [apiUrl]);

  // Persist ComfyUI URL
  useEffect(() => {
    localStorage.setItem('clawgame-comfyui-url', comfyuiUrl);
  }, [comfyuiUrl]);

  // Persist preview runtime
  useEffect(() => {
    setRequestedPreviewRuntimeKind(previewRuntime);
  }, [previewRuntime]);

  // Fetch health endpoint for version info
  useEffect(() => {
    const baseUrl = apiUrl.replace(/\/+$/, '');
    fetch(`${baseUrl}/health`)
      .then(res => {
        if (!res.ok) throw new Error('not ok');
        return res.json();
      })
      .then(data => {
        setHealthVersion(data.version || data.app?.version || null);
        setApiStatus('connected');
      })
      .catch(() => {
        setApiStatus('error');
      });
  }, [apiUrl]);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    } else if (t === 'light') {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('dark-theme', 'light-theme');
    }
  };

  const themeOptions: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    { value: 'dark', label: 'Dark', icon: <Moon size={18} /> },
    { value: 'light', label: 'Light', icon: <Sun size={18} /> },
    { value: 'system', label: 'System', icon: <Monitor size={18} /> },
  ];

  return (
    <div className="settings-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>⚙️ Settings</h1>
            <p>Configure your ClawGame workspace</p>
          </div>
        </div>
      </header>

      <div className="settings-content">
        {/* Connection Settings */}
        <section className="settings-section">
          <div className="section-header">
            <Server size={20} />
            <h2>Connections</h2>
          </div>
          <div className="settings-card">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">API Server URL</span>
                <span className="setting-desc">
                  ClawGame backend API endpoint
                  {apiStatus === 'connected' && <span style={{ color: 'var(--success, #10b981)', marginLeft: 8 }}>● Connected</span>}
                  {apiStatus === 'error' && <span style={{ color: 'var(--error, #ef4444)', marginLeft: 8 }}>● Unreachable</span>}
                </span>
              </div>
              <input
                className="setting-input"
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:3000"
              />
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">ComfyUI Server URL</span>
                <span className="setting-desc">ComfyUI instance for AI asset generation</span>
              </div>
              <input
                className="setting-input"
                type="url"
                value={comfyuiUrl}
                onChange={(e) => setComfyuiUrl(e.target.value)}
                placeholder="http://localhost:8188"
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="settings-section">
          <div className="section-header">
            <Palette size={20} />
            <h2>Appearance</h2>
          </div>
          <div className="settings-card">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Theme</span>
                <span className="setting-desc">Choose the application color scheme</span>
              </div>
              <div className="theme-toggle">
                {themeOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`theme-option ${theme === opt.value ? 'active' : ''}`}
                    onClick={() => setTheme(opt.value)}
                    title={opt.label}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Preview Runtime */}
        <section className="settings-section">
          <div className="section-header">
            <Monitor size={20} />
            <h2>Preview Runtime</h2>
          </div>
          <div className="settings-card">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Runtime Backend</span>
                <span className="setting-desc">
                  Choose which runtime ClawGame should try to use for preview sessions.
                  {runtimeSelection.fellBack && runtimeSelection.reason && (
                    <span style={{ color: 'var(--warning, #f59e0b)', marginLeft: 8 }}>
                      Requested backend will fall back for now.
                    </span>
                  )}
                </span>
              </div>
              <select
                className="setting-select"
                value={previewRuntime}
                onChange={(event) => setPreviewRuntime(event.target.value as PreviewRuntimeKind)}
              >
                {PREVIEW_RUNTIMES.map((runtime) => (
                  <option key={runtime.kind} value={runtime.kind}>
                    {runtime.label}{runtime.experimental ? ' (Experimental)' : ''}{runtime.available ? '' : ' [Unavailable]'}
                  </option>
                ))}
              </select>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Current Resolution</span>
                <span className="setting-desc">
                  Active backend: {runtimeSelection.active.label}
                  {runtimeSelection.fellBack && runtimeSelection.reason ? ` — ${runtimeSelection.reason}` : ''}
                </span>
              </div>
              <div style={{ minWidth: 220, color: 'var(--text-muted)' }}>
                {runtimeSelection.active.description}
              </div>
            </div>
          </div>
        </section>

        {/* AI Settings */}
        <section className="settings-section">
          <div className="section-header">
            <Cpu size={20} />
            <h2>AI</h2>
          </div>
          <div className="settings-card">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Default AI Model</span>
                <span className="setting-desc">Select the model used for code generation and analysis</span>
              </div>
              <select
                className="setting-select"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              >
                {AI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Auto-suggestions</span>
                <span className="setting-desc">Show AI suggestions automatically while coding</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoSuggestions}
                  onChange={(e) => setAutoSuggestions(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="settings-section">
          <div className="section-header">
            <Keyboard size={20} />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <div className="settings-card shortcuts-card">
            <table className="shortcuts-table">
              <tbody>
                {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                  <tr key={i}>
                    <td className="shortcut-keys">
                      {shortcut.keys.map((key, j) => (
                        <React.Fragment key={j}>
                          <kbd>{key}</kbd>
                          {j < shortcut.keys.length - 1 && <span className="key-plus">+</span>}
                        </React.Fragment>
                      ))}
                    </td>
                    <td className="shortcut-desc">{shortcut.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* About */}
        <section className="settings-section">
          <div className="section-header">
            <Info size={20} />
            <h2>About</h2>
          </div>
          <div className="settings-card about-card">
            <div className="about-row">
              <span className="about-label">ClawGame</span>
              <span className="about-value">{healthVersion || 'v0.12.0'}</span>
            </div>
            <div className="about-row">
              <span className="about-label">Codename</span>
              <span className="about-value">rpg-foundation</span>
            </div>
            <div className="about-row">
              <span className="about-label">Engine</span>
              <span className="about-value">Custom 2D Web Engine</span>
            </div>
            <div className="about-row">
              <span className="about-label">API Status</span>
              <span className="about-value">
                {apiStatus === 'connected' ? '🟢 Connected' : apiStatus === 'error' ? '🔴 Unreachable' : '⚪ Checking…'}
              </span>
            </div>
            <div className="about-links">
              <a href="https://github.com/pgedeon/ClawGame" target="_blank" rel="noopener noreferrer" className="about-link">
                GitHub <ChevronRight size={14} />
              </a>
              <a href="https://github.com/pgedeon/ClawGame/issues" target="_blank" rel="noopener noreferrer" className="about-link">
                Report Bug <ChevronRight size={14} />
              </a>
              <a href="https://github.com/pgedeon/ClawGame/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="about-link">
                Changelog <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
