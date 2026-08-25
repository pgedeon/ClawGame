/**
 * ShareButton + SharePopover — one-click share/publish (slice 1).
 *
 * Mounted in the GamePreviewPage top bar and the EditorPage toolbar with the
 * same handler. Flow per design §2 S2: click Share → popover → "Create share
 * link" (fresh export + capability-token host via POST /api/projects/:id/share)
 * → result state with copy/open, honest availability note, source-included
 * labeling (CEO ruling 2), and the project's existing share links.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Copy, ExternalLink, Trash2, Loader2, X } from 'lucide-react';
import { api, type HostedExport, type ShareResponse } from '../api/client';
import { useToast } from './Toast';

interface ShareButtonProps {
  projectId: string;
  projectName?: string;
}

type PopoverState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'result'; link: string; hosted: HostedExport }
  | { phase: 'error'; message: string; stage: 'export' | 'host' | 'unknown' };

/** Stage extraction from both the typed failure body and thrown APIClientError. */
function stageOf(res: ShareResponse | null, err?: any): 'export' | 'host' | 'unknown' {
  const stage = res?.stage ?? (err?.details as { stage?: string } | undefined)?.stage;
  return stage === 'export' || stage === 'host' ? stage : 'unknown';
}

export const ShareButton: React.FC<ShareButtonProps> = ({ projectId, projectName }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="share-button-wrap">
      <button
        className="gp-device-btn share-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Share this game"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Link2 size={13} />
      </button>
      {open && <SharePopover projectId={projectId} projectName={projectName} onClose={() => setOpen(false)} />}
    </div>
  );
};

const SharePopover: React.FC<{ projectId: string; projectName?: string; onClose: () => void }> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const [state, setState] = useState<PopoverState>({ phase: 'idle' });
  const [existing, setExisting] = useState<HostedExport[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const loadExisting = useCallback(async () => {
    try {
      setExisting(await api.listHostedExports(projectId));
    } catch {
      // Listing is best-effort chrome; never blocks creating a new link.
      setExisting([]);
    }
  }, [projectId]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  // Click-outside dismiss.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  const createLink = useCallback(async () => {
    setState({ phase: 'creating' });
    let failed: ShareResponse | null = null;
    try {
      const res = await api.shareProject(projectId);
      if (res.success && res.hosted && res.url) {
        setState({ phase: 'result', link: res.url, hosted: res.hosted });
        void loadExisting();
        return;
      }
      failed = res;
    } catch (err: any) {
      failed = { success: false, error: err?.message, ...(err?.details ?? {}) } as ShareResponse;
    }
    // Distinct failure states (US-1 AC 5): export vs host each get their own toast.
    const stage = stageOf(failed);
    setState({ phase: 'error', stage, message: failed?.error || 'Sharing failed' });
    showToast({
      type: 'error',
      message:
        stage === 'export'
          ? 'Export failed — fix the game or check the server, then retry'
          : stage === 'host'
            ? 'Hosting failed — check that the ClawGame server is running'
            : 'Sharing failed — check that the server is running',
    });
  }, [projectId, loadExisting, showToast]);

  const copyLink = useCallback(
    (url: string) => {
      navigator.clipboard.writeText(url).then(
        () => showToast({ type: 'success', message: 'Share link copied!' }),
        () => showToast({ type: 'error', message: 'Failed to copy link' }),
      );
    },
    [showToast],
  );

  const openLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener');
  }, []);

  const deleteShare = useCallback(
    async (hosted: HostedExport) => {
      try {
        await api.deleteHostedExport(projectId, hosted.id);
        showToast({ type: 'success', message: 'Share deleted — its link no longer works' });
        await loadExisting();
        setState((s) => (s.phase === 'result' && s.hosted.id === hosted.id ? { phase: 'idle' } : s));
      } catch {
        showToast({ type: 'error', message: 'Failed to delete share' });
      }
    },
    [projectId, loadExisting, showToast],
  );

  return (
    <div className="share-popover" ref={popoverRef} role="dialog" aria-label="Share this game">
      <div className="share-popover-head">
        <strong>Share “{projectName || 'your game'}”</strong>
        <button className="share-close" onClick={onClose} title="Close" aria-label="Close share dialog">
          <X size={13} />
        </button>
      </div>

      {state.phase === 'idle' && (
        <div className="share-popover-body">
          <p className="share-hint">Creates a fresh playable link anyone can open — no account, no install.</p>
          <button className="share-primary" onClick={createLink}>
            Create share link
          </button>
        </div>
      )}

      {state.phase === 'creating' && (
        <div className="share-popover-body">
          <p className="share-hint">
            <Loader2 size={12} className="spin" /> Exporting a fresh build and hosting it…
          </p>
        </div>
      )}

      {state.phase === 'result' && (
        <div className="share-popover-body">
          <input className="share-link-field" readOnly value={state.link} onFocus={(e) => e.target.select()} />
          <div className="share-actions">
            <button className="share-secondary" onClick={() => copyLink(state.link)}>
              <Copy size={12} /> Copy
            </button>
            <button className="share-secondary" onClick={() => openLink(state.link)}>
              <ExternalLink size={12} /> Open
            </button>
          </div>
          <p className="share-note">Anyone with the link can play your game.</p>
          {/* Source exposure is include-by-default (CEO ruling 2026-08-25) — labeled visibly. */}
          <p className="share-note share-note-source">📦 Includes full editable source — anyone can view and remix the code.</p>
          <p className="share-note share-note-availability">Your link works while your ClawGame server is running.</p>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="share-popover-body">
          <p className="share-error">{state.message}</p>
          <button className="share-primary" onClick={createLink}>
            Try again
          </button>
        </div>
      )}

      {existing.length > 0 && (
        <div className="share-existing">
          <div className="share-existing-title">Existing links</div>
          {[...existing]
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((h) => (
              <div key={h.id} className="share-existing-row">
                <span className="share-existing-url" title={h.hostedUrl}>
                  {h.hostedUrl}
                </span>
                <span className="share-existing-meta">
                  {h.expiresAt ? `expires ${new Date(h.expiresAt).toLocaleDateString()}` : 'never expires'}
                </span>
                <button className="share-icon-btn" title="Copy link" onClick={() => copyLink(h.hostedUrl)}>
                  <Copy size={11} />
                </button>
                <button className="share-icon-btn danger" title="Delete share" onClick={() => deleteShare(h)}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
