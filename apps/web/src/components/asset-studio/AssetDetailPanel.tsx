/**
 * @clawgame/web - Asset Detail Panel
 * Right panel showing selected asset details, metadata, and actions.
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { AssetMetadata } from '../../api/client';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './types';

interface AssetDetailPanelProps {
  asset: AssetMetadata | null;
  projectId: string | undefined;
  onDelete: (id: string, name: string) => void;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, projectId, onDelete }) => {
  const getPreviewUrl = (): string => {
    if (!projectId || !asset) return '';
    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
    return `${API_BASE}/api/projects/${projectId}/assets/${asset.id}/file`;
  };

  if (!asset) {
    return (
      <div className="studio-details">
        <div className="no-selection">
          <div className="no-selection-icon">🎨</div>
          <h3>No Asset Selected</h3>
          <p>Select an asset from the grid to view details</p>
          <p className="hint">Or generate a new asset with AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-details">
      {/* Header */}
      <div className="detail-header">
        <div className="detail-title">
          <div className="detail-icon" style={{ backgroundColor: ASSET_TYPE_COLORS[asset.type] }}>
            {ASSET_TYPE_ICONS[asset.type]}
          </div>
          <div>
            <h2>{asset.name}</h2>
            <span className="detail-type">{asset.type}</span>
            {asset.aiGeneration && <span className="ai-tag">AI Generated</span>}
          </div>
        </div>
        <div className="detail-actions">
          <button
            onClick={() => onDelete(asset.id, asset.name)}
            className="icon-button danger"
            title="Delete asset"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Preview Image */}
      <div className="detail-preview">
        <img src={getPreviewUrl()} alt={asset.name} className="preview-image" />
      </div>

      {/* Details Grid */}
      <div className="detail-section">
        <h3>Details</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <label>Type</label>
            <span>{asset.type}</span>
          </div>
          <div className="detail-item">
            <label>Size</label>
            <span>{(asset.size / 1024).toFixed(2)} KB</span>
          </div>
          <div className="detail-item">
            <label>Format</label>
            <span>{asset.mimeType.split('/')[1].toUpperCase()}</span>
          </div>
          <div className="detail-item">
            <label>Status</label>
            <span className={`status-badge status-${asset.status}`}>{asset.status}</span>
          </div>
        </div>
      </div>

      {/* Original Prompt */}
      {asset.prompt && (
        <div className="detail-section">
          <h3>Original Prompt</h3>
          <p className="prompt-text">{asset.prompt}</p>
        </div>
      )}

      {/* AI Generation Details */}
      {asset.aiGeneration && (
        <div className="detail-section">
          <h3>AI Generation Details</h3>
          <div className="ai-details-grid">
            <div className="detail-item">
              <label>Style</label>
              <span>{asset.aiGeneration.style}</span>
            </div>
            <div className="detail-item">
              <label>Duration</label>
              <span>{asset.aiGeneration.duration}ms</span>
            </div>
            <div className="detail-item">
              <label>Generation ID</label>
              <span className="generation-id">{asset.aiGeneration.generationId}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tags */}
      {asset.tags && asset.tags.length > 0 && (
        <div className="detail-section">
          <h3>Tags</h3>
          <div className="tag-list">
            {asset.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Created Date */}
      <div className="detail-section">
        <h3>Created</h3>
        <p>{new Date(asset.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
};
