/**
 * @clawgame/web - Git Center Page
 * Version control management for game projects
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { GitBranch, Plus, Undo2, Send, FileText } from 'lucide-react';
import '../git-center.css';

interface GitStatus {
  initialized: boolean;
  branch: string | null;
  ahead: number;
  behind: number;
  changedFiles: { path: string; status: string }[];
  recentCommits: { hash: string; message: string }[];
}

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
}

const STATUS_LABELS: Record<string, string> = {
  M: 'modified', A: 'added', D: 'deleted', '??': 'untracked',
  AM: 'added', MM: 'modified', MD: 'deleted',
};

function statusClass(s: string): string {
  if (s.includes('D')) return 'deleted';
  if (s === 'A' || s === 'AM') return 'added';
  if (s === '??') return 'untracked';
  return 'modified';
}

export function GitCenterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [diff, setDiff] = useState<DiffFile[]>([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        api.gitStatus(projectId),
        api.gitDiff(projectId),
      ]);
      setStatus(s as GitStatus);
      setDiff(d.files);
    } catch (err) {
      console.error('Git status error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleInit = async () => {
    if (!projectId) return;
    setActionLoading(true);
    try {
      await api.gitInit(projectId);
      await refresh();
    } catch (err) {
      console.error('Git init error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!projectId || !commitMsg.trim()) return;
    setActionLoading(true);
    try {
      await api.gitCommit(projectId, commitMsg.trim());
      setCommitMsg('');
      await refresh();
    } catch (err) {
      console.error('Git commit error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevert = async (filePath: string) => {
    if (!projectId) return;
    setActionLoading(true);
    try {
      await api.gitRevert(projectId, { filePath });
      setSelectedFile(null);
      await refresh();
    } catch (err) {
      console.error('Git revert error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="git-center git-loading"><div className="build-spinner" /> Loading Git status…</div>;
  }

  if (!status?.initialized) {
    return (
      <div className="git-center">
        <h1><GitBranch size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Git Center</h1>
        <div className="git-card git-empty">
          <p>This project is not under version control.</p>
          <button className="git-init-btn" onClick={handleInit} disabled={actionLoading}>
            <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Initialize Git Repository
          </button>
        </div>
      </div>
    );
  }

  const fileDiff = (path: string) => diff.find((d) => d.path === path);

  return (
    <div className="git-center">
      <h1><GitBranch size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Git Center</h1>

      {/* Status Card */}
      <div className="git-card">
        <h2>Repository Status</h2>
        <div className="git-status-grid">
          <div className="git-stat">
            <div className="git-stat-value">{status.branch || '—'}</div>
            <div className="git-stat-label">Branch</div>
          </div>
          <div className="git-stat">
            <div className="git-stat-value">{status.ahead}</div>
            <div className="git-stat-label">Ahead</div>
          </div>
          <div className="git-stat">
            <div className="git-stat-value">{status.behind}</div>
            <div className="git-stat-label">Behind</div>
          </div>
          <div className="git-stat">
            <div className="git-stat-value">{status.changedFiles.length}</div>
            <div className="git-stat-label">Changed</div>
          </div>
        </div>
      </div>

      {/* Changed Files + Commit */}
      <div className="git-card">
        <h2>Changed Files</h2>
        {status.changedFiles.length === 0 ? (
          <div className="git-empty">Working tree clean ✨</div>
        ) : (
          <>
            <ul className="git-file-list">
              {status.changedFiles.map((f) => (
                <li key={f.path} className="git-file-item" onClick={() => setSelectedFile(selectedFile === f.path ? null : f.path)} style={{ cursor: 'pointer' }}>
                  <span className={`git-file-status ${statusClass(f.status)}`}>{f.status}</span>
                  <span className="git-file-path">{f.path}</span>
                  {selectedFile === f.path && fileDiff(f.path) && (
                    <span className="git-diff-file">
                      <span className="git-diff-add">+{fileDiff(f.path)!.additions}</span>
                      <span className="git-diff-del">-{fileDiff(f.path)!.deletions}</span>
                    </span>
                  )}
                  <button className="git-btn git-btn-danger git-btn-sm" onClick={(e) => { e.stopPropagation(); handleRevert(f.path); }} disabled={actionLoading}>
                    <Undo2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '1rem' }}>
              <div className="git-commit-form">
                <input
                  className="git-commit-input"
                  placeholder="Commit message…"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
                  disabled={actionLoading}
                />
                <button className="git-btn git-btn-primary" onClick={handleCommit} disabled={actionLoading || !commitMsg.trim()}>
                  <Send size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> Commit All
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Commit History */}
      <div className="git-card">
        <h2><FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />Recent Commits</h2>
        {status.recentCommits.length === 0 ? (
          <div className="git-empty">No commits yet</div>
        ) : (
          <ul className="git-commit-list">
            {status.recentCommits.map((c) => (
              <li key={c.hash} className="git-commit-entry">
                <div>
                  <span className="git-commit-hash">{c.hash}</span>
                  <span className="git-commit-msg">{c.message}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
