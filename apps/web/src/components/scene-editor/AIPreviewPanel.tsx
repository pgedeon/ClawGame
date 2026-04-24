/**
 * @clawgame/web - AI Edit Preview Panel
 * Shows diffs from AI commands before applying, with rollback support.
 */

import React, { useState, useCallback } from 'react';
import {
  AIEditOperation,
  AIDiffPreview,
  assessRisk,
  generateDiffSummary,
} from '@clawgame/engine';
import { Check, X, RotateCcw, AlertTriangle, Shield } from 'lucide-react';

interface AIPreviewPanelProps {
  preview: AIDiffPreview | null;
  onApply: (operations: AIEditOperation[]) => void;
  onReject: () => void;
  history: AIEditOperation[];
  onRollback: (operationId: string) => void;
}

const riskColors: Record<string, string> = {
  safe: '#22c55e',
  moderate: '#eab308',
  risky: '#ef4444',
};

export function AIPreviewPanel({ preview, onApply, onReject, history, onRollback }: AIPreviewPanelProps) {
  if (!preview) {
    return (
      <div className="ai-preview-panel">
        <div className="panel-header"><h3>AI Edits</h3></div>
        {history.length === 0 ? (
          <div className="empty-state">No AI edits yet.</div>
        ) : (
          <div className="ai-history">
            {history.map((op) => (
              <div key={op.id} className="ai-history-item">
                <span className={`ai-type-badge ai-type-${op.type}`}>{op.type.replace('_', ' ')}</span>
                <span>{op.description}</span>
                <button className="icon-btn" onClick={() => onRollback(op.id)} title="Rollback">
                  <RotateCcw size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const risk = assessRisk(preview.operations);

  return (
    <div className="ai-preview-panel">
      <div className="panel-header"><h3>AI Edit Preview</h3></div>

      <div className="ai-risk-indicator" style={{ color: riskColors[risk] }}>
        {risk === 'risky' && <AlertTriangle size={16} />}
        {risk === 'safe' && <Shield size={16} />}
        {risk === 'moderate' && <AlertTriangle size={16} />}
        <span>Risk: {risk.toUpperCase()}</span>
      </div>

      <pre className="ai-diff-text">{generateDiffSummary(preview.operations)}</pre>

      {preview.operations.map((op) => (
        <div key={op.id} className="ai-op-item">
          <span className="ai-type-badge ai-type-{op.type}">{op.type}</span>
          <span>{op.description}</span>
        </div>
      ))}

      <div className="ai-actions">
        <button className="action-btn success" onClick={() => onApply(preview.operations)}>
          <Check size={16} /> Apply
        </button>
        <button className="action-btn danger" onClick={onReject}>
          <X size={16} /> Reject
        </button>
      </div>
    </div>
  );
}
