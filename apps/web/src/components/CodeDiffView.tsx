import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

/**
 * Code diff view for AI-proposed changes.
 * Shows old→new with red/green highlighting, Apply/Reject buttons.
 */

interface CodeDiffViewProps {
  path: string;
  oldCode?: string;
  newCode: string;
  summary: string;
  confidence: number;
  isApplied?: boolean;
  isApplying?: boolean;
  onApply?: () => void;
  onReject?: () => void;
}

interface DiffLine {
  type: 'context' | 'added' | 'removed';
  content: string;
  oldNum?: number;
  newNum?: number;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0, j = 0;
  let oldNum = 0, newNum = 0;

  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      oldNum++; newNum++;
      result.push({ type: 'context', content: oldLines[i], oldNum, newNum });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      newNum++;
      result.push({ type: 'added', content: newLines[j], newNum });
      j++;
    } else {
      oldNum++;
      result.push({ type: 'removed', content: oldLines[i], oldNum });
      i++;
    }
  }

  return result;
}

export function CodeDiffView({
  path, oldCode, newCode, summary, confidence,
  isApplied, isApplying, onApply, onReject,
}: CodeDiffViewProps) {
  const diffLines = useMemo(() => {
    const oldLines = (oldCode || '').split('\n');
    const newLines = newCode.split('\n');
    if (!oldCode) {
      // New file — all lines are additions
      return newLines.map((content, i) => ({
        type: 'added' as const,
        content,
        newNum: i + 1,
        oldNum: undefined as number | undefined,
      }));
    }
    return computeDiff(oldLines, newLines);
  }, [oldCode, newCode]);

  const addedCount = diffLines.filter(l => l.type === 'added').length;
  const removedCount = diffLines.filter(l => l.type === 'removed').length;

  return (
    <div className={`code-diff-view${isApplied ? ' code-diff-applied' : ''}`}>
      <div className="code-diff-header">
        <div className="code-diff-path">{path}</div>
        <div className="code-diff-stats">
          <span className="stat-added">+{addedCount}</span>
          <span className="stat-removed">−{removedCount}</span>
        </div>
      </div>
      {summary && <div className="code-diff-summary">{summary}</div>}
      <div className="code-diff-content">
        <table>
          <tbody>
            {diffLines.slice(0, 80).map((line, i) => (
              <tr key={i} className={`diff-line diff-${line.type}`}>
                <td className="diff-num diff-num-old">{line.oldNum ?? ''}</td>
                <td className="diff-num diff-num-new">{line.newNum ?? ''}</td>
                <td className="diff-marker">{line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}</td>
                <td className="diff-content"><pre>{line.content}</pre></td>
              </tr>
            ))}
            {diffLines.length > 80 && (
              <tr className="diff-line diff-context">
                <td colSpan={4} className="diff-truncated">
                  ... {diffLines.length - 80} more lines
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="code-diff-actions">
        <ConfidenceBadge confidence={confidence} />
        {isApplied ? (
          <span className="applied-badge"><CheckCircle2 size={14} /> Applied</span>
        ) : (
          <>
            {onReject && (
              <button className="diff-reject-btn" onClick={onReject} disabled={isApplying}>
                <XCircle size={14} /> Reject
              </button>
            )}
            {onApply && (
              <button className="diff-apply-btn" onClick={onApply} disabled={isApplying}>
                {isApplying ? <><RefreshCw size={14} className="spinning" /> Applying...</> : <><CheckCircle2 size={14} /> Apply</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const level = pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low';
  return (
    <div className={`confidence-badge confidence-${level}`}>
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="confidence-text">{pct}%</span>
    </div>
  );
}
