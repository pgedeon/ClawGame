/**
 * @clawgame/web - Asset Browser Panel
 * Left sidebar for browsing, searching, filtering, and dragging assets to canvas
 */

import React, { useEffect, useState, useCallback } from 'react';
import { api, type AssetMetadata, type AssetType } from '../../api/client';
import { ASSET_TYPE_FILTERS } from './types';
import { logger } from '../../utils/logger';
import {
  RefreshCw as RefreshIcon,
} from 'lucide-react';

interface AssetBrowserPanelProps {
  projectId: string;
  /** Currently selected entity ID (for "attach to entity" action) */
  selectedEntityId: string | null;
  /** Callback when user wants to attach an asset to selected entity */
  onAttachAsset: (assetId: string) => void;
  /** Shared asset image cache ref */
  assetCache: Map<string, HTMLImageElement>;
  /** Callback to set cache when loaded */
  setAssetCache: React.Dispatch<React.SetStateAction<Map<string, HTMLImageElement>>>;
}

export function AssetBrowserPanel({
  projectId,
  selectedEntityId,
  onAttachAsset,
  assetCache,
  setAssetCache,
}: AssetBrowserPanelProps) {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetFilter, setAssetFilter] = useState<AssetType | 'all'>('all');
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      setAssetsLoading(true);
      const assetList = await api.listAssets(projectId);
      // API returns { success, data, pagination } — unwrap
      const items = Array.isArray(assetList)
        ? assetList
        : Array.isArray((assetList as any)?.data)
          ? (assetList as any).data
          : [];
      setAssets(items);
    } catch (err) {
      logger.error('Failed to load assets:', err);
    } finally {
      setAssetsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Preload asset images
  useEffect(() => {
    assets.forEach((asset) => {
      loadAssetImage(asset);
    });
  }, [assets]);

  const loadAssetImage = async (asset: AssetMetadata): Promise<HTMLImageElement | null> => {
    const cached = assetCache.get(asset.id);
    if (cached) return cached;

    try {
      if (asset.mimeType === 'image/svg+xml') {
        const blob = await api.getAssetFile(projectId, asset.id);
        const svgText = await blob.text();
        const img = new Image();
        const blobUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
        img.src = blobUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        setAssetCache(prev => new Map(prev).set(asset.id, img));
        return img;
      }

      const blob = await api.getAssetFile(projectId, asset.id);
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.src = blobUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      setAssetCache(prev => new Map(prev).set(asset.id, img));
      return img;
    } catch (err) {
      logger.error('Failed to load asset image:', err);
      return null;
    }
  };

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    if (assetFilter !== 'all' && asset.type !== assetFilter) return false;
    if (assetSearch && !asset.name.toLowerCase().includes(assetSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="asset-browser">
      <div className="asset-browser-header">
        <h3>Assets</h3>
        <div className="asset-browser-controls">
          <button onClick={loadAssets} title="Refresh assets">
            <RefreshIcon size={16} />
          </button>
        </div>
      </div>

      <div className="asset-search">
        <input
          type="text"
          placeholder="Search assets..."
          value={assetSearch}
          onChange={(e) => setAssetSearch(e.target.value)}
        />
      </div>

      <div className="asset-filters">
        {ASSET_TYPE_FILTERS.map((type) => (
          <button
            key={type.value}
            className={`asset-filter ${assetFilter === type.value ? 'active' : ''}`}
            onClick={() => setAssetFilter(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {assetsLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          Loading assets...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          {assetSearch ? 'No matching assets' : 'No assets yet'}
        </div>
      ) : (
        <div className="asset-grid">
          {filteredAssets.map((asset) => {
            const img = assetCache.get(asset.id);
            return (
              <div
                key={asset.id}
                className={`asset-item ${selectedAssetId === asset.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    assetId: asset.id,
                    name: asset.name,
                    type: asset.type,
                    url: asset.url,
                    width: img?.naturalWidth || img?.width,
                    height: img?.naturalHeight || img?.height,
                  }));
                }}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                {img && img.complete ? (
                  <img
                    src={img.src}
                    alt={asset.name}
                    className="asset-preview"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="asset-icon">📷</div>
                )}
                {asset.aiGeneration && <span className="ai-badge">AI</span>}
                <span className="asset-name">{asset.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {selectedAssetId && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-alt)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--fg-secondary)' }}>
            Selected: {assets.find((a) => a.id === selectedAssetId)?.name}
          </p>
          {selectedEntityId ? (
            <button
              onClick={() => onAttachAsset(selectedAssetId)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Attach to Selected Entity
            </button>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Select an entity to attach this asset, or drag it to canvas
            </p>
          )}
        </div>
      )}
    </div>
  );
}
