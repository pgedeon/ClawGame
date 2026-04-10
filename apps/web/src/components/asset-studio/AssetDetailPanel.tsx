/**
 * @clawgame/web - Asset Detail Panel
 * Right panel showing selected asset details, metadata, and actions.
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Link2 } from 'lucide-react';
import { api, type AssetMetadata } from '../../api/client';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './types';
import { useToast } from '../Toast';
import { logger } from '../../utils/logger';

interface AssetDetailPanelProps {
  asset: AssetMetadata | null;
  projectId: string | undefined;
  onDelete: (id: string, name: string) => void;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, projectId, onDelete }) => {
  const [sceneEntities, setSceneEntities] = useState<Array<{ id: string; name?: string; type: string }>>([]);
  const [showBindModal, setShowBindModal] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState(false);
  const { showToast } = useToast();

  const getPreviewUrl = (): string => {
    if (!projectId || !asset) return '';
    const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
    return `${API_BASE}/api/projects/${projectId}/assets/${asset.id}/file`;
  };

  // Load scene entities for binding
  const loadSceneEntities = async () => {
    if (!projectId) return;
    try {
      const sceneFile = await api.readFile(projectId, 'scenes/main-scene.json');
      const scene = typeof sceneFile.content === 'string' ? JSON.parse(sceneFile.content) : sceneFile.content;
      const entities = (scene.entities || []).map((e: any) => ({
        id: e.id,
        name: e.name || e.id,
        type: e.type || 'unknown',
      }));
      setSceneEntities(entities);
    } catch {
      // No scene file — that's fine
      setSceneEntities([]);
    }
  };

  const handleBindToEntity = async () => {
    if (!projectId || !asset || !selectedEntityId) return;
    setIsBinding(true);
    try {
      // Read scene
      const sceneFile = await api.readFile(projectId, 'scenes/main-scene.json');
      const scene = typeof sceneFile.content === 'string' ? JSON.parse(sceneFile.content) : sceneFile.content;

      // Find entity and add sprite binding
      const entity = scene.entities.find((e: any) => e.id === selectedEntityId);
      if (!entity) throw new Error('Entity not found');

      if (!entity.components) entity.components = {};
      entity.components.sprite = {
        assetId: asset.id,
        assetType: asset.type,
        url: asset.url,
      };

      // Write back
      await api.writeFile(projectId, 'scenes/main-scene.json', JSON.stringify(scene, null, 2));
      showToast({ type: 'success', message: `Bound ${asset.name} to ${entity.name || entity.id}` });
      setShowBindModal(false);
      setSelectedEntityId(null);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Failed to bind asset' });
    } finally {
      setIsBinding(false);
    }
  };

  const canBind = asset && ['sprite', 'tileset', 'texture', 'icon', 'background'].includes(asset.type);

  if (!asset) {
    return (
      <div className="studio-details">
        <div className="no-selection">
          <div className="no-selection-icon">🎨</div>
          <h3>No Asset Selected</h3>
          <p>Select an asset from the grid to view details</p>
        </div>
      </div>
    );
  }

  const iconNode = ASSET_TYPE_ICONS[asset.type] || ASSET_TYPE_ICONS.sprite;
  const color = ASSET_TYPE_COLORS[asset.type] || '#94a3b8';

  return (
    <div className="studio-details">
      {/* Preview */}
      <div className="detail-preview">
        <img src={getPreviewUrl()} alt={asset.name} />
      </div>

      {/* Basic Info */}
      <div className="detail-section">
        <div className="detail-header">
          <span className="detail-type-badge" style={{ color, borderColor: color }}>
            {iconNode}
            {asset.type}
          </span>
          <button className="detail-delete" onClick={() => onDelete(asset.id, asset.name)} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
        <h2 className="detail-name">{asset.name}</h2>
      </div>

      {/* Bind to Scene Entity */}
      {canBind && (
        <div className="detail-section">
          <button
            className="bind-entity-btn"
            onClick={() => { loadSceneEntities(); setShowBindModal(true); }}
          >
            <Link2 size={14} />
            Bind to Scene Entity
          </button>

          {showBindModal && (
            <div className="bind-modal">
              <h4>Select Entity</h4>
              {sceneEntities.length === 0 ? (
                <p className="bind-empty">No entities found in scene</p>
              ) : (
                <div className="bind-entity-list">
                  {sceneEntities.map(entity => (
                    <button
                      key={entity.id}
                      className={`bind-entity-item ${selectedEntityId === entity.id ? 'selected' : ''}`}
                      onClick={() => setSelectedEntityId(entity.id)}
                    >
                      <span className="bind-entity-name">{entity.name || entity.id}</span>
                      <span className="bind-entity-type">{entity.type}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="bind-actions">
                <button className="bind-cancel" onClick={() => setShowBindModal(false)}>Cancel</button>
                <button
                  className="bind-confirm"
                  onClick={handleBindToEntity}
                  disabled={!selectedEntityId || isBinding}
                >
                  {isBinding ? 'Binding...' : 'Bind'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="detail-section">
        <h3>Metadata</h3>
        <div className="detail-meta-grid">
          <div className="detail-item">
            <label>Size</label>
            <span>{(asset.size / 1024).toFixed(1)} KB</span>
          </div>
          <div className="detail-item">
            <label>Format</label>
            <span>{asset.mimeType}</span>
          </div>
          {asset.prompt && (
            <div className="detail-item full-width">
              <label>Prompt</label>
              <span className="detail-prompt">{asset.prompt}</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Generation Details */}
      {(asset as any).aiGeneration && (
        <div className="detail-section">
          <h3>AI Generation Details</h3>
          <div className="ai-details-grid">
            <div className="detail-item">
              <label>Style</label>
              <span>{(asset as any).aiGeneration.style}</span>
            </div>
            <div className="detail-item">
              <label>Duration</label>
              <span>{(asset as any).aiGeneration.duration}ms</span>
            </div>
            <div className="detail-item">
              <label>Generation ID</label>
              <span className="generation-id">{(asset as any).aiGeneration.generationId}</span>
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
