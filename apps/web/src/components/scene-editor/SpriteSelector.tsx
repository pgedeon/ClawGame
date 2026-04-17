/**
 * @clawgame/web - Sprite Selector Component
 * Allows users to select specific sprite assets for entities in the scene editor
 */

import React, { useEffect, useState, useCallback } from 'react';
import { assetMappingManager, configureProjectAssets } from '../../config/assetMapping';
import { api, type AssetMetadata } from '../../api/client';
import { spriteManager } from '../../utils/spriteLoader';
import { logger } from '../../utils/logger';
import { 
  Check as CheckIcon, 
  X as XIcon,
  Image as ImageIcon,
} from 'lucide-react';

interface SpriteSelectorProps {
  projectId: string;
  entityType: string;
  currentAssetId?: string | null;
  onAssetSelect: (assetId: string | null) => void;
  onClose: () => void;
}

interface AssetPreview {
  asset: AssetMetadata;
  image: HTMLImageElement | null;
  loadError: boolean;
}

export function SpriteSelector({
  projectId,
  entityType,
  currentAssetId,
  onAssetSelect,
  onClose,
}: SpriteSelectorProps) {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [previews, setPreviews] = useState<Map<string, AssetPreview>>(new Map());
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(currentAssetId ?? null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState<'all' | 'sprite' | 'tileset'>('sprite');

  // Initialize project mapping if not already configured
  useEffect(() => {
    try {
      configureProjectAssets(projectId, 'rpg'); // Default to RPG, will override with actual genre if available
    } catch (error) {
      logger.warn('Failed to configure project mapping:', error);
    }
  }, [projectId]);

  // Load assets
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const assetList = await api.listAssets(projectId);
      
      // Filter by asset type if specified
      const filtered = assetFilter === 'all' 
        ? assetList 
        : assetList.filter(asset => asset.type === assetFilter);
      
      setAssets(filtered);
    } catch (err) {
      logger.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, assetFilter]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Preload asset previews
  useEffect(() => {
    const loadPreviews = async () => {
      const newPreviews = new Map<string, AssetPreview>();
      
      for (const asset of assets) {
        const existingPreview = previews.get(asset.id);
        
        // Skip if we already have a preview
        if (existingPreview && (existingPreview.image || existingPreview.loadError)) {
          newPreviews.set(asset.id, existingPreview);
          continue;
        }
        
        try {
          const image = await loadAssetPreview(asset);
          newPreviews.set(asset.id, { asset, image, loadError: false });
        } catch (error) {
          logger.error(`Failed to load preview for ${asset.id}:`, error);
          newPreviews.set(asset.id, { asset, image: null, loadError: true });
        }
      }
      
      setPreviews(newPreviews);
    };

    loadPreviews();
  }, [assets]);

  const loadAssetPreview = async (asset: AssetMetadata): Promise<HTMLImageElement> => {
    // Check cache first
    const cached = previews.get(asset.id)?.image;
    if (cached) return cached;

    try {
      const blob = await api.getAssetFile(projectId, asset.id);
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.src = blobUrl;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Failed to load image'));
        };
      });

      return img;
    } catch (error) {
      throw new Error(`Failed to load asset preview: ${error}`);
    }
  };

  const getRecommendedAssets = useCallback(() => {
    try {
      const recommendedAssetId = assetMappingManager.getAssetForEntity(projectId, entityType);
      if (recommendedAssetId && assets.find(asset => asset.id === recommendedAssetId)) {
        return [recommendedAssetId];
      }
    } catch (error) {
      logger.warn('Failed to get recommended assets:', error);
    }
    
    return [];
  }, [projectId, entityType, assets]);

  useEffect(() => {
    const recommendedIds = getRecommendedAssets();
    if (recommendedIds.length > 0 && !selectedAssetId) {
      setSelectedAssetId(recommendedIds[0]);
    }
  }, [getRecommendedAssets, selectedAssetId]);

  const filteredAssets = assets.filter(asset => {
    if (search && !asset.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
  };

  const handleConfirm = () => {
    onAssetSelect(selectedAssetId);
    onClose();
  };

  const handleCancel = () => {
    onAssetSelect(currentAssetId ?? null); // Restore current
    onClose();
  };

  const renderAssetGrid = () => {
    if (loading) {
      return (
        <div className="sprite-selector-loading">
          <div className="spinner" />
          <p>Loading assets...</p>
        </div>
      );
    }

    if (filteredAssets.length === 0) {
      return (
        <div className="sprite-selector-empty">
          <ImageIcon size={48} />
          <p>No assets found</p>
        </div>
      );
    }

    return (
      <div className="sprite-selector-grid">
        {filteredAssets.map(asset => {
          const preview = previews.get(asset.id);
          const isSelected = selectedAssetId === asset.id;
          const isRecommended = getRecommendedAssets().includes(asset.id);

          return (
            <div
              key={asset.id}
              className={`sprite-selector-item ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
              onClick={() => handleSelect(asset.id)}
            >
              <div className="sprite-preview">
                {preview?.image ? (
                  <img 
                    src={preview.image.src} 
                    alt={asset.name}
                    className="sprite-image"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : preview?.loadError ? (
                  <div className="sprite-error">
                    <ImageIcon size={32} />
                    <span>Failed to load</span>
                  </div>
                ) : (
                  <div className="sprite-loading">
                    <div className="spinner-small" />
                  </div>
                )}
              </div>
              
              <div className="sprite-info">
                <div className="sprite-name">{asset.name}</div>
                <div className="sprite-size">
                  {asset.url.includes('/api/') ? '32 × 32' : 'Unknown'} {/* Simplified size display */}
                </div>
                {isRecommended && (
                  <div className="recommended-badge">Recommended</div>
                )}
              </div>
              
              {isSelected && (
                <div className="sprite-check">
                  <CheckIcon size={20} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="sprite-selector-overlay" onClick={handleCancel}>
      <div className="sprite-selector" onClick={(e) => e.stopPropagation()}>
        <div className="sprite-selector-header">
          <h3>Select Sprite for {entityType}</h3>
          <button className="close-btn" onClick={handleCancel}>
            <XIcon size={20} />
          </button>
        </div>
        
        <div className="sprite-selector-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filter-buttons">
            <button
              className={`filter-btn ${assetFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAssetFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${assetFilter === 'sprite' ? 'active' : ''}`}
              onClick={() => setAssetFilter('sprite')}
            >
              Sprites
            </button>
            <button
              className={`filter-btn ${assetFilter === 'tileset' ? 'active' : ''}`}
              onClick={() => setAssetFilter('tileset')}
            >
              Tilesets
            </button>
          </div>
        </div>
        
        <div className="sprite-selector-content">
          {renderAssetGrid()}
        </div>
        
        <div className="sprite-selector-footer">
          <button className="cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="confirm-btn" 
            onClick={handleConfirm}
            disabled={!selectedAssetId}
          >
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  );
}