/**
 * LocalDiagnosticsSection — Settings "Local diagnostics" (onboarding design §4,
 * P2-closing funnel readout lane).
 *
 * Readout over the storage-only activation event log: total event count, the
 * §4 funnel counts incl. share_created/game_remixed, activation status, A/B
 * variant, plus per-token server-side play/remix aggregates fetched from
 * GET /api/share/:token/stats for tokens known from the local log ("where
 * available" — unknown/expired/unreachable tokens are skipped silently).
 *
 * Actions: Copy event log (clipboard, pretty JSON) + Clear (wipes the local
 * log only — server-side counters are aggregate integers and stay).
 *
 * Storage-only principles hold: nothing here writes to the network except the
 * read-only stats fetch; no PII is displayed (ids/counters/enums only).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Copy, Check, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import {
  clearEvents,
  exportEvents,
  getEvents,
  getFunnelSnapshot,
  peekAbVariant,
  type ActivationEvent,
  type StorageLike,
} from '../utils/activationEvents';
import { logger } from '../utils/logger';

/** Funnel steps shown in canonical §4 order; share pair appended. */
const FUNNEL_STEPS: Array<{ name: string; label: string }> = [
  { name: 'landing_viewed', label: 'Landing viewed' },
  { name: 'template_launch_clicked', label: 'Template launched' },
  { name: 'prompt_submit_clicked', label: 'Prompt submitted' },
  { name: 'project_created', label: 'Projects created' },
  { name: 'preview_opened', label: 'Previews opened' },
  { name: 'ai_prompt_submitted', label: 'AI prompts' },
  { name: 'edit_applied', label: 'Edits applied' },
  { name: 'play_started', label: 'Plays started' },
  { name: 'share_created', label: 'Shares created' },
  { name: 'game_remixed', label: 'Games remixed' },
];

/** Distinct share tokens from share_created/game_remixed props, newest first, capped. */
export function collectKnownShareTokens(events: ActivationEvent[], cap = 5): string[] {
  const tokens: string[] = [];
  for (let i = events.length - 1; i >= 0 && tokens.length < cap; i--) {
    const token = events[i].props?.hostedId;
    if (typeof token === 'string' && token.length > 0 && !tokens.includes(token)) {
      tokens.push(token);
    }
  }
  return tokens;
}

interface ShareStatsState {
  loading: boolean;
  /** token → stats; absent/failed tokens are simply not present. */
  byToken: Record<string, { plays: number; remixes: number }>;
}

export function LocalDiagnosticsSection({ storage }: { storage?: StorageLike } = {}) {
  const [snapshot, setSnapshot] = useState(() => getFunnelSnapshot(storage));
  const [copied, setCopied] = useState(false);
  const [shareStats, setShareStats] = useState<ShareStatsState>({ loading: false, byToken: {} });

  const refresh = useCallback(() => {
    setSnapshot(getFunnelSnapshot(storage));
  }, [storage]);

  const knownTokens = useMemo(
    () => collectKnownShareTokens(getEvents(storage)),
    // Recompute when the snapshot changes (i.e. after Clear) — cheap re-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storage, snapshot.totalEvents],
  );

  useEffect(() => {
    if (knownTokens.length === 0) return;
    let cancelled = false;
    setShareStats({ loading: true, byToken: {} });
    Promise.all(
      knownTokens.map((token) =>
        api
          .getShareStats(token)
          .then((stats) => ({ token, stats }))
          .catch(() => ({ token, stats: null })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const byToken: ShareStatsState['byToken'] = {};
      for (const { token, stats } of results) {
        if (stats) byToken[token] = stats;
      }
      setShareStats({ loading: false, byToken });
    });
    return () => {
      cancelled = true;
    };
  }, [knownTokens]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportEvents(storage));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Copy event log failed:', err);
    }
  }, [storage]);

  const handleClear = useCallback(() => {
    clearEvents(storage);
    refresh();
  }, [storage, refresh]);

  const variant = peekAbVariant(storage);

  return (
    <section className="settings-section" aria-label="Local diagnostics">
      <div className="section-header">
        <Activity size={20} />
        <h2>Local diagnostics</h2>
      </div>
      <div className="settings-card">
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label" data-testid="diagnostics-event-count">
              {snapshot.totalEvents} event{snapshot.totalEvents === 1 ? '' : 's'} stored
            </span>
            <span className="setting-desc">
              Storage-only activation funnel (design §4) — never leaves this machine.
              {variant ? ` A/B variant: ${variant}.` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="setting-select diagnostics-btn"
              data-testid="diagnostics-copy"
              onClick={() => void handleCopy()}
              disabled={snapshot.totalEvents === 0}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy event log'}
            </button>
            <button
              type="button"
              className="setting-select diagnostics-btn"
              data-testid="diagnostics-clear"
              onClick={handleClear}
              disabled={snapshot.totalEvents === 0}
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Activation</span>
            <span className="setting-desc">First play on a project with ≥1 applied edit</span>
          </div>
          <span
            data-testid="diagnostics-activation"
            style={{ color: snapshot.activated ? 'var(--success, #10b981)' : 'var(--text-muted)', fontWeight: 600 }}
          >
            {snapshot.activated ? '✓ Activated' : 'Not yet'}
          </span>
        </div>

        <div className="setting-row diagnostics-funnel-row">
          <div className="setting-info">
            <span className="setting-label">Funnel</span>
            <span className="setting-desc">Event counts from this browser's local log</span>
          </div>
          <div className="diagnostics-funnel-grid" data-testid="diagnostics-funnel">
            {FUNNEL_STEPS.map(({ name, label }) => (
              <div key={name} className="diagnostics-funnel-cell">
                <span className="diagnostics-funnel-value">{snapshot.counts[name] ?? 0}</span>
                <span className="diagnostics-funnel-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {knownTokens.length > 0 && (
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Shared game counters</span>
              <span className="setting-desc">Server-side totals per share link (where available)</span>
            </div>
            <div data-testid="diagnostics-share-stats" style={{ textAlign: 'right' }}>
              {shareStats.loading && <span className="setting-desc">Loading…</span>}
              {!shareStats.loading &&
                knownTokens.map((token) => {
                  const stats = shareStats.byToken[token];
                  return (
                    <div key={token} className="setting-desc">
                      <code>{token.slice(0, 8)}…</code>{' '}
                      {stats ? `${stats.plays} plays · ${stats.remixes} remixes` : 'unavailable'}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
