/**
 * Remix import flow (share/publish slice 2).
 *
 * The injected bar on shared links deep-links here at /remix/:token. The page
 * fetches the share sidecar payload (GET /api/share/:token/remix), forks an
 * editable copy through the NORMAL project-create path (api.createProject —
 * fresh server-generated id, so the dirname===id invariant holds by
 * construction; no hand-rolled ids, no id rewriting), writes the verbatim
 * scene JSON into the new project, records recent-projects lineage, and
 * redirects into the editor.
 *
 * StrictMode note: effects run twice in dev (mount → cleanup → mount) with
 * refs PRESERVED across that cycle — so startedRef correctly lets exactly one
 * run proceed, and that run must NOT be aborted by the first cleanup
 * (bailing on `cancelled` would kill the only live import and strand the page
 * in loading forever — found in slice-2 browser verify). Post-unmount
 * setState/navigate are no-ops in React 18, so no cancellation is needed.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { recordRecentProject } from '../utils/recentProjects';
import { trackEvent } from '../utils/activationEvents';
import './remix.css';

/** API origin for the "back to game" link (the playable share lives there). */
const API_BASE: string = (import.meta as any).env?.VITE_API_URL || window.location.origin;

export const RemixPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'error'>('loading');
  const [originName, setOriginName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  /** Guards the import effect against StrictMode double-mount double-imports. */
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const payload = await api.getRemixPayload(token);

        if (!payload || payload.schema !== 1) {
          setErrorMsg(
            'This link does not carry editable source. It may be an older share or an invalid link — the game itself still plays.',
          );
          setPhase('error');
          return;
        }

        if (payload.sourceIncluded === false) {
          setErrorMsg('This share is play-only — remixing is disabled for this link.');
          setPhase('error');
          return;
        }

        setOriginName(payload.project.name || 'this game');

        // Fork via the existing create path: server generates a fresh id and
        // the full default project scaffold (dirs + starter files).
        const name = `Remix of ${payload.project.name || 'Untitled Game'}`;
        const created = await api.createProject({
          name,
          genre: payload.project.genre || 'action',
          artStyle: payload.project.artStyle || 'pixel',
          description: payload.project.description || '',
          settings: payload.project.settings,
          runtimeTarget: 'browser',
          renderBackend: 'canvas',
        });

        // Write the shared snapshot's scene JSON into the new project.
        await api.createDirectory(created.id, 'scenes');
        await api.writeFile(
          created.id,
          'scenes/main-scene.json',
          JSON.stringify(payload.scene, null, 2),
        );

        recordRecentProject({ id: created.id, name, remixedFrom: token });

        // Storage-only funnel (design §4): recipient-side remix event, fired
        // only after the fork fully succeeded. Ids only — no payload text.
        trackEvent('game_remixed', { hostedId: token, projectId: created.id });

        navigate(`/project/${created.id}/editor`, { replace: true });
      } catch (err) {
        const status = (err as any)?.status;
        setErrorMsg(
          status === 404
            ? 'This remix link is invalid or the shared game no longer exists.'
            : `Remix failed: ${(err as Error)?.message || 'unknown error'}`,
        );
        setPhase('error');
      }
    };

    void run();
  }, [token, navigate]);

  const playUrl = token ? `${API_BASE}/share/${encodeURIComponent(token)}` : null;

  return (
    <div className="remix-landing">
      <div className="remix-card" data-testid="remix-card">
        {phase === 'loading' ? (
          <>
            <div className="remix-icon">🎮</div>
            <h1>Building your remix…</h1>
            <p>
              {originName
                ? <>Forking <strong>{originName}</strong> into your own editable copy.</>
                : 'Fetching the game source…'}
            </p>
            <p className="remix-note">You'll land in the editor in a moment.</p>
          </>
        ) : (
          <>
            <div className="remix-icon">⚠️</div>
            <h1>Remix unavailable</h1>
            <p>{errorMsg}</p>
            <div className="remix-actions">
              {playUrl && (
                <a className="remix-btn" href={playUrl} target="_blank" rel="noopener">
                  ▶ Back to the game
                </a>
              )}
              <a className="remix-btn remix-btn-secondary" href="/">
                Open ClawGame
              </a>
            </div>
            {token && <p className="remix-id">Game: {token}</p>}
          </>
        )}
      </div>
    </div>
  );
};
