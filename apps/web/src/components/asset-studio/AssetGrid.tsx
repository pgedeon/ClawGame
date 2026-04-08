/**
 * @clawgame/web - Asset Grid
 * Displays assets in a browsable grid with selection support.
 */

import React from 'react';
import type { AssetMetadata, AssetType } from '../../api/client';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './types';

interface AssetGridProps {
  assets: AssetMetadata[];
  selectedAsset: AssetMetadata | null;
  onSelect: (asset: AssetMetadata) => void;
  loading: boolean;
  searchQuery: string;
  filter: AssetType | '';
}

const getPreviewUrl = (projectId: string | undefined, asset: AssetMetadata): string => {
  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
  return `${API_BASE}/api/projects/${projectId}/assets/${asset.id}/file`;
};

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  selectedAsset,
  onSelect,
  loading,
  searchQuery,
  filter,
}) => {
  if (loading) {
    return (
      <div className="studio-main">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-main">
      <div className="asset-grid-header">
        <h3>
          Assets
          {assets.length > 0 && <span className="asset-count">{assets.length}</span>}
        </h3>
        {assets.some(a => a.aiGeneration) && (
          <span className="ai-badge">AI Generated</span>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h3>No assets found</h3>
          <p>
            {searchQuery || filter
              ? 'Try adjusting your filters or search terms'
              : 'Generate your first asset using AI or upload one from your computer'}
          </p>
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className={`asset-card ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
              onClick={() => onSelect(asset)}
            >
              <div className="asset-preview">
                <img
                  src={getPreviewUrl(undefined, asset)}
                  alt={asset.name}
                  loading="lazy"
                />
                <div className="asset-type-badge" style={{ backgroundColor: ASSET_TYPE_COLORS[asset.type] }}>
                  {ASSET_TYPE_ICONS[asset.type]}
                </div>
                {asset.aiGeneration && (
                  <div className="ai-generated-badge" title="AI Generated">✨</div>
                )}
              </div>
              <div className="asset-info">
                <h4 className="asset-name" title={asset.name}>{asset.name}</h4>
                <div className="asset-meta">
                  <span className="asset-type-label">{asset.type}</span>
                  <span className={`asset-status ${asset.status}`}>
                    {asset.status === 'generated' ? '✓' : asset.status === 'error' ? '✗' : '•'}
                  </span>
                </div>
                {asset.aiGeneration && (
                  <div className="ai-info">
                    <span className="ai-style">{asset.aiGeneration.style}</span>
                    <span className="ai-duration">{asset.aiGeneration.duration}ms</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
