/**
 * Remix landing placeholder (share/publish slice 1).
 *
 * The injected bar on shared links shows a "🎮 Remix this game" CTA pointing
 * here. The real auto-import flow (POST /api/hosted/:id/remix → new editable
 * project) ships in slice 2 per design §6 — this page exists so the CTA is
 * never a dead link (defensibility rule). Slice 2 REPLACES this file.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import './remix.css';

export const RemixPage: React.FC = () => {
  const { hostedId } = useParams<{ hostedId: string }>();

  return (
    <div className="remix-landing">
      <div className="remix-card">
        <div className="remix-icon">🎮</div>
        <h1>Remix is almost here</h1>
        <p>
          One-click remixing — forking this game into your own editable copy —
          ships in the next update.
        </p>
        <p className="remix-note">
          Your link still works: the game above is fully playable, and its source
          is included by design.
        </p>
        {hostedId && <p className="remix-id">Game: {hostedId}</p>}
      </div>
    </div>
  );
};
