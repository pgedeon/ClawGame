/**
 * GalleryPage — community gallery/feed v1 (P3.1, GET /api/gallery).
 *
 * Card grid over the public share listing: name, play count, remix count,
 * shared date. Each card deep-links to the API-origin /share/:token page
 * (instant play + Remix — recipient flow unchanged). New tab keeps the app
 * context; the hosted page's CSP sandbox concerns only links leaving the
 * hosted page, not links entering it.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Shuffle, LayoutGrid, RefreshCw } from 'lucide-react';
import { api, type GalleryGame } from '../api/client';
import { logger } from '../utils/logger';
import './gallery.css';

function formatSharedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function GalleryPage() {
  const [games, setGames] = useState<GalleryGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const list = await api.listGallery();
      setGames(list);
    } catch (err) {
      logger.error('Failed to load gallery:', err);
      setError('Could not load the gallery. Is the game server running?');
    } finally {
      setReloading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gallery-page">
      <header className="page-header">
        <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
        <div className="header-content">
          <div className="header-left">
            <h1>Community Gallery</h1>
            <p>Games shared by creators — open one to play instantly, or remix it into your own.</p>
          </div>
          <button
            type="button"
            className="gallery-refresh"
            onClick={() => { setReloading(true); void load(); }}
            disabled={reloading || games === null}
            aria-label="Refresh gallery"
          >
            <RefreshCw size={16} className={reloading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="gallery-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {games === null && !error && (
        <div className="gallery-loading">
          <div className="gallery-loading-spinner" />
        </div>
      )}

      {games !== null && games.length === 0 && !error && (
        <div className="gallery-empty" data-testid="gallery-empty">
          <LayoutGrid size={40} />
          <h2>No shared games yet</h2>
          <p>
            Share a project from its preview page and it will show up here for everyone to play
            and remix.
          </p>
          <Link to="/dashboard" className="gallery-empty-cta">Build a game</Link>
        </div>
      )}

      {games !== null && games.length > 0 && (
        <div className="gallery-grid" data-testid="gallery-grid">
          {games.map((game) => (
            <a key={game.id} className="gallery-card" href={game.url} target="_blank" rel="noopener noreferrer">
              <div className="gallery-card-icon" aria-hidden="true">
                <LayoutGrid size={26} />
              </div>
              <div className="gallery-card-body">
                <h3 className="gallery-card-name">{game.name}</h3>
                <div className="gallery-card-meta">
                  <span title="Plays"><Play size={13} /> {game.plays}</span>
                  <span title="Remixes"><Shuffle size={13} /> {game.remixes}</span>
                  <span className="gallery-card-date">Shared {formatSharedDate(game.sharedAt)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
