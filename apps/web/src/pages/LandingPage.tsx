/**
 * Landing page (`/`) — onboarding design §2 S1.
 * Template gallery default + AI prompt bar beside it + Continue building
 * strip. No auth, no wizard, no modal before first Play (US-1).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Sparkles, FolderOpen, Loader2 } from 'lucide-react';
import { templates, type GameTemplate } from '../templates/templateCatalog';
import { launchTemplate, matchPromptToTemplate } from '../templates/templateLaunch';
import { getRecentProjects, touchRecentProject, type RecentProjectEntry } from '../utils/recentProjects';
import { logger } from '../utils/logger';
import './landing.css';

const MAX_RECENT = 5;

export function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentProjectEntry[]>([]);

  useEffect(() => {
    // Render immediately from the local index — no API wait (US-2 AC 1).
    setRecent(getRecentProjects().slice(0, MAX_RECENT));
  }, []);

  const continueProjects = useMemo(() => recent.slice(0, MAX_RECENT), [recent]);

  const openLaunch = async (template: GameTemplate, description?: string) => {
    setLaunchingId(template.id);
    setError(null);
    try {
      const { id } = await launchTemplate(template.id, { description });
      navigate(`/project/${id}/preview`);
    } catch (err) {
      logger.error('Template launch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setLaunchingId(null);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    const template = templates.find((t) => t.id === matchPromptToTemplate(text)) ?? templates[0];
    await openLaunch(template, text);
  };

  const openRecent = (entry: RecentProjectEntry) => {
    touchRecentProject(entry.id, {});
    navigate(`/project/${entry.id}`);
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1 className="landing-wordmark">🎮 ClawGame</h1>
        <nav className="landing-header-actions">
          <a href="#how-it-works" className="landing-how-link">
            How it works
          </a>
          <button
            type="button"
            className="landing-settings-btn"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </nav>
      </header>

      {error && (
        <div className="landing-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <form className="landing-prompt-bar" onSubmit={handlePromptSubmit}>
        <div className="landing-prompt-row">
          <Sparkles size={18} className="landing-prompt-icon" />
          <input
            type="text"
            className="landing-prompt-input"
            placeholder="Describe your game…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            aria-label="Describe your game"
          />
          <button type="submit" className="landing-prompt-submit" disabled={!prompt.trim() || launchingId !== null}>
            Create
          </button>
        </div>
        <p className="landing-prompt-caption">Starts from the closest template — you can iterate with AI inside.</p>
      </form>

      {continueProjects.length > 0 && (
        <section className="landing-recent" aria-label="Continue building">
          <h2 className="landing-section-title">
            <FolderOpen size={16} /> Continue building
          </h2>
          <div className="landing-recent-strip">
            {continueProjects.map((entry) => (
              <button key={entry.id} type="button" className="landing-recent-card" onClick={() => openRecent(entry)}>
                <span className="landing-recent-name">{entry.name}</span>
                <span className="landing-recent-meta">
                  {entry.templateId ? `${entry.templateId} · ` : ''}
                  {new Date(entry.lastOpenedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="landing-gallery" aria-label="Start from a template">
        <h2 className="landing-section-title">Start playing in seconds</h2>
        <div className="landing-gallery-grid">
          {templates.map((template) => (
            <article key={template.id} className="landing-template-card">
              <div className="landing-template-icon">
                <template.icon size={32} />
              </div>
              <div className="landing-template-info">
                <h3>{template.name}</h3>
                <p className="landing-template-desc">{template.description}</p>
                <span className="landing-template-genre">{template.genre}</span>
              </div>
              <button
                type="button"
                className="landing-play-btn"
                disabled={launchingId !== null}
                onClick={() => openLaunch(template)}
              >
                {launchingId === template.id ? (
                  <>
                    <Loader2 size={16} className="landing-spin" /> Launching…
                  </>
                ) : (
                  <>
                    <Play size={16} /> Play now
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-how">
        <h2 className="landing-section-title">How it works</h2>
        <ol className="landing-how-steps">
          <li>Pick a template — a project is created instantly.</li>
          <li>Press Start Game to play it.</li>
          <li>Describe changes and let AI edit your game.</li>
        </ol>
      </section>
    </div>
  );
}
