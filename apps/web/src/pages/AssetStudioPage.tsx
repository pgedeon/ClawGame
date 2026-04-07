/**
 * @clawgame/web - Asset Studio Page
 * AI-powered asset generation and management for game development.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata, type AssetType } from '../api/client';
import { useToast } from '../components/Toast';
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  Download, 
  RefreshCw,
  Filter,
  Search,
  X,
  ChevronRight,
  Palette,
  Image,
  Music,
  Layers,
  Layout
} from 'lucide-react';

// Asset type to icon mapping
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  sprite: <Image size={20} />,
  tileset: <Layers size={20} />,
  texture: <Palette size={20} />,
  icon: <Layout size={20} />,
  audio: <Music size={20} />,
  background: <Image size={20} />,
};

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  sprite: '#8b5cf6',
  tileset: '#10b981',
  texture: '#f59e0b',
  icon: '#ef4444',
  audio: '#6366f1',
  background: '#0f172a',
};

export function AssetStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();
  
  // Asset state
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AssetType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType>('sprite');
  const [selectedStyle, setSelectedStyle] = useState<'pixel' | 'vector' | 'hand-drawn'>('pixel');
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Load assets on mount and when filters change
  useEffect(() => {
    loadAssets();
  }, [projectId, filter, searchQuery]);

  const loadAssets = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const assetList = await api.listAssets(projectId, {
        type: filter || undefined,
        search: searchQuery || undefined,
      });
      setAssets(assetList);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
      showToast({
        type: 'error',
        message: `Failed to load assets: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAsset = async () => {
    if (!generationPrompt.trim() || isGenerating || !projectId) return;
    
    setIsGenerating(true);
    
    try {
      showToast({
        type: 'info',
        message: '🎨 Generating asset with AI...',
      });
      
      const newAsset = await api.generateAsset(projectId, {
        type: selectedType,
        prompt: generationPrompt,
        options: {
          style: selectedStyle,
          format: 'svg',
          width: 64,
          height: 64,
        },
      });
      
      // Add to assets list
      setAssets(prev => [newAsset, ...prev]);
      
      // Select the new asset
      setSelectedAsset(newAsset);
      
      // Clear prompt
      setGenerationPrompt('');
      
      showToast({
        type: 'success',
        message: `✅ Generated "${newAsset.name}" successfully!`,
      });
      
    } catch (error: any) {
      console.error('Asset generation failed:', error);
      showToast({
        type: 'error',
        message: `Failed to generate asset: ${error.message}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!projectId) return;
    
    if (!confirm(`Delete "${assetName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      await api.deleteAsset(projectId, assetId);
      
      // Remove from list
      setAssets(prev => prev.filter(a => a.id !== assetId));
      
      // Clear selection if deleted
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
      
      showToast({
        type: 'success',
        message: `Deleted "${assetName}"`,
      });
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      showToast({
        type: 'error',
        message: `Failed to delete asset: ${error.message}`,
      });
    }
  };

  const handleRefreshAssets = () => {
    loadAssets();
    showToast({
      type: 'info',
      message: '🔄 Refreshing assets...',
    });
  };

  const getAssetPreviewUrl = (asset: AssetMetadata): string => {
    // For generated assets with placeholder SVGs, use a data URL
    // In production, this would be the actual URL from the asset.url
    if (asset.status === 'generated') {
      // Generate a simple SVG based on type
      const color = ASSET_TYPE_COLORS[asset.type];
      return `data:image/svg+xml;base64,${btoa(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="${color}" opacity="0.2"/>
  <rect x="16" y="16" width="32" height="32" fill="${color}" opacity="0.5"/>
  <text x="32" y="36" text-anchor="middle" fill="${color}" font-size="12" font-family="Arial">
    ${asset.type.charAt(0).toUpperCase()}
  </text>
</svg>`)}`;
    }
    
    // For uploaded assets, return the API URL
    return `${api.getAssetFile(projectId!, asset.id)}`.toString();
  };

  const filteredAssets = assets.filter(asset => {
    if (filter && asset.type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.prompt?.toLowerCase().includes(query) ||
        asset.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="asset-studio-page">
      <header className="page-header">
        <div className="header-left">
          <h1>Asset Studio</h1>
          <p>AI-powered asset generation and management</p>
        </div>
        <div className="header-actions">
          <button 
            className="icon-button"
            onClick={handleRefreshAssets}
            title="Refresh assets"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="asset-studio-container">
        {/* Left Panel: Generation & Upload */}
        <div className="studio-sidebar">
          {/* Generate Section */}
          <div className="studio-panel">
            <div className="panel-header">
              <Sparkles size={18} className="panel-icon" />
              <h2>Generate with AI</h2>
            </div>
            
            <div className="generate-form">
              <div className="form-group">
                <label>Asset Type</label>
                <div className="asset-type-grid">
                  {(Object.keys(ASSET_TYPE_ICONS) as AssetType[]).map((type) => (
                    <button
                      key={type}
                      className={`asset-type-button ${selectedType === type ? 'active' : ''}`}
                      onClick={() => setSelectedType(type)}
                      title={type}
                    >
                      {ASSET_TYPE_ICONS[type]}
                      <span className="type-label">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Style</label>
                <div className="style-grid">
                  {(['pixel', 'vector', 'hand-drawn'] as const).map((style) => (
                    <button
                      key={style}
                      className={`style-button ${selectedStyle === style ? 'active' : ''}`}
                      onClick={() => setSelectedStyle(style)}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prompt">Prompt</label>
                <textarea
                  id="prompt"
                  value={generationPrompt}
                  onChange={(e) => setGenerationPrompt(e.target.value)}
                  placeholder="Describe your asset... e.g., 'A red pixel art sword with glowing blade'"
                  rows={4}
                  className="prompt-input"
                />
              </div>

              <button
                onClick={handleGenerateAsset}
                disabled={!generationPrompt.trim() || isGenerating}
                className="generate-button"
              >
                {isGenerating ? '⏳ Generating...' : (
                  <>
                    <Sparkles size={18} />
                    Generate Asset
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="studio-panel">
            <div className="panel-header">
              <Upload size={18} className="panel-icon" />
              <h2>Upload Asset</h2>
            </div>
            <p className="upload-hint">Upload existing assets from your computer</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="upload-button secondary"
            >
              <Upload size={18} />
              Upload File
            </button>
          </div>

          {/* Filters */}
          <div className="studio-panel">
            <div className="panel-header">
              <Filter size={18} className="panel-icon" />
              <h2>Filter Assets</h2>
            </div>
            <div className="filter-controls">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="clear-search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as AssetType | '')}
                className="type-filter"
              >
                <option value="">All Types</option>
                {(Object.keys(ASSET_TYPE_ICONS) as AssetType[]).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Middle Panel: Asset Grid */}
        <div className="studio-main">
          <div className="asset-grid-header">
            <h3>
              Assets 
              {filteredAssets.length > 0 && (
                <span className="asset-count">{filteredAssets.length}</span>
              )}
            </h3>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎨</div>
              <h3>No assets found</h3>
              <p>
                {searchQuery || filter
                  ? 'Try adjusting your filters or search terms'
                  : 'Generate your first asset using AI or upload one from your computer'
                }
              </p>
            </div>
          ) : (
            <div className="asset-grid">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={`asset-card ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <div className="asset-preview">
                    <img
                      src={getAssetPreviewUrl(asset)}
                      alt={asset.name}
                      loading="lazy"
                    />
                    <div className="asset-type-badge" style={{ backgroundColor: ASSET_TYPE_COLORS[asset.type] }}>
                      {ASSET_TYPE_ICONS[asset.type]}
                    </div>
                  </div>
                  <div className="asset-info">
                    <h4 className="asset-name" title={asset.name}>{asset.name}</h4>
                    <div className="asset-meta">
                      <span className="asset-type-label">{asset.type}</span>
                      <span className="asset-status status-ok">✓</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Asset Details */}
        <div className="studio-details">
          {selectedAsset ? (
            <>
              <div className="detail-header">
                <div className="detail-title">
                  <div className="detail-icon" style={{ backgroundColor: ASSET_TYPE_COLORS[selectedAsset.type] }}>
                    {ASSET_TYPE_ICONS[selectedAsset.type]}
                  </div>
                  <div>
                    <h2>{selectedAsset.name}</h2>
                    <span className="detail-type">{selectedAsset.type}</span>
                  </div>
                </div>
                <div className="detail-actions">
                  <button
                    onClick={() => handleDeleteAsset(selectedAsset.id, selectedAsset.name)}
                    className="icon-button danger"
                    title="Delete asset"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="detail-preview">
                <img
                  src={getAssetPreviewUrl(selectedAsset)}
                  alt={selectedAsset.name}
                  className="preview-image"
                />
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Type</label>
                    <span>{selectedAsset.type}</span>
                  </div>
                  <div className="detail-item">
                    <label>Size</label>
                    <span>{(selectedAsset.size / 1024).toFixed(2)} KB</span>
                  </div>
                  <div className="detail-item">
                    <label>Format</label>
                    <span>{selectedAsset.mimeType.split('/')[1].toUpperCase()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span className={`status-badge status-${selectedAsset.status}`}>
                      {selectedAsset.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAsset.prompt && (
                <div className="detail-section">
                  <h3>Prompt</h3>
                  <p className="prompt-text">{selectedAsset.prompt}</p>
                </div>
              )}

              {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                <div className="detail-section">
                  <h3>Tags</h3>
                  <div className="tag-list">
                    {selectedAsset.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Created</h3>
                <p>{new Date(selectedAsset.createdAt).toLocaleString()}</p>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">🎨</div>
              <h3>No Asset Selected</h3>
              <p>Select an asset from the grid to view details</p>
              <p className="hint">Or generate a new asset with AI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
