/**
 * @clawgame/web - Asset Studio Page
 * AI-powered asset generation and management for game development.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata, type AssetType, type GenerateAssetRequest, type GenerationStatus } from '../api/client';
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
  Layout,
  Loader2
} from 'lucide-react';
import { logger } from '../utils/logger';

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

// Styles for generation
const STYLES = [
  { value: 'pixel', label: 'Pixel Art' },
  { value: 'vector', label: 'Vector' },
  { value: 'hand-drawn', label: 'Hand-drawn' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'realistic', label: 'Realistic' },
] as const;

const AssetStudioPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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
  const [selectedStyle, setSelectedStyle] = useState<'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic'>('pixel');
  
  // Generation tracking
  const [generations, setGenerations] = useState<GenerationStatus[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<GenerationStatus | null>(null);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load assets on mount and when filters change
  useEffect(() => {
    loadAssets();
    loadGenerations();
    
    // Set up periodic polling for generation completion
    pollTimerRef.current = setInterval(() => {
      if (generations.length > 0) {
        checkGenerationProgress();
      }
    }, 2000); // Poll every 2 seconds
    
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
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
      logger.error('Failed to load assets:', error);
      showToast({
        type: 'error',
        message: `Failed to load assets: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGenerations = async () => {
    if (!projectId) return;
    
    try {
      const genList = await api.getGenerations(projectId);
      setGenerations(genList);
      
      // Check if any are completed and need polling
      const completed = genList.filter(g => g.status === 'completed' && !g.result?.svg);
      if (completed.length > 0) {
        pollGenerations();
      }
    } catch (error: any) {
      logger.error('Failed to load generations:', error);
    }
  };

  const checkGenerationProgress = async () => {
    if (!projectId || generations.length === 0) return;
    
    try {
      const updatedGenerations = await api.getGenerations(projectId);
      setGenerations(updatedGenerations);
      
      // Update active generation if any
      const active = updatedGenerations.find(g => g.status === 'generating');
      if (active) {
        setActiveGeneration(active);
      }
      
      // Check for newly completed generations and poll to create assets
      const newCompleted = updatedGenerations.filter(
        g => g.status === 'completed' && g.result?.svg && generations.find(og => og.id === g.id)?.status !== 'completed'
      );
      
      if (newCompleted.length > 0) {
        pollGenerations();
      }
    } catch (error: any) {
      logger.error('Failed to check generation progress:', error);
    }
  };

  const pollGenerations = async () => {
    if (!projectId) return;
    
    try {
      const result = await api.pollGenerations(projectId);
      
      if (result.created.length > 0) {
        showToast({
          type: 'success',
          message: `✅ Generated ${result.created.length} new assets!`,
        });
        loadAssets(); // Refresh assets
      }
      
      if (result.errors.length > 0) {
        showToast({
          type: 'error',
          message: `❌ ${result.errors.length} generation(s) failed`,
        });
      }
      
      // Load fresh generations
      loadGenerations();
    } catch (error: any) {
      logger.error('Failed to poll generations:', error);
    }
  };

  const handleGenerateAsset = async () => {
    if (!generationPrompt.trim() || isGenerating || !projectId) return;
    
    setIsGenerating(true);
    
    try {
      showToast({
        type: 'info',
        message: '🎨 Starting AI generation...',
      });
      
      const generateRequest: GenerateAssetRequest = {
        type: selectedType,
        prompt: generationPrompt,
        options: {
          style: selectedStyle,
          format: 'svg',
          width: 64,
          height: 64,
        },
      };
      
      const result = await api.generateAsset(projectId, generateRequest);
      
      // Add to generations list
      const newGeneration = await api.getGenerationStatus(projectId, result.generationId);
      if (newGeneration) {
        setGenerations(prev => [newGeneration, ...prev]);
        setActiveGeneration(newGeneration);
      }
      
      // Clear prompt
      setGenerationPrompt('');
      
      showToast({
        type: 'success',
        message: `🎨 Generation started! Creating ${selectedType} "${generationPrompt.substring(0, 20)}..."`,
      });
      
    } catch (error: any) {
      logger.error('Asset generation failed:', error);
      showToast({
        type: 'error',
        message: `Failed to start generation: ${error.message}`,
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
      logger.error('Failed to delete asset:', error);
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
    // For AI-generated assets, serve the actual SVG file from the API
    if (asset.aiGeneration) {
      return `${api.getAssetFile(projectId!, asset.id)}`.toString();
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

  const getGenerationStatusText = (status: GenerationStatus['status']) => {
    switch (status) {
      case 'pending': return 'Queued';
      case 'generating': return 'Creating...';
      case 'completed': return 'Done';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

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
          {/* Generation Status */}
          {activeGeneration && (
            <div className="studio-panel generation-status">
              <div className="panel-header">
                <Loader2 size={18} className="panel-icon spinning" />
                <h2>Generation Progress</h2>
              </div>
              
              <div className="generation-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${activeGeneration.progress}%` }}
                  />
                </div>
                <div className="progress-text">
                  {activeGeneration.progress}% - {getGenerationStatusText(activeGeneration.status)}
                </div>
              </div>
              
              {activeGeneration.prompt && (
                <div className="generation-prompt">
                  <span className="prompt-label">Prompt:</span>
                  <span className="prompt-text">{activeGeneration.prompt}</span>
                </div>
              )}
            </div>
          )}

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
                  {STYLES.map((style) => (
                    <button
                      key={style.value}
                      className={`style-button ${selectedStyle === style.value ? 'active' : ''}`}
                      onClick={() => setSelectedStyle(style.value as any)}
                    >
                      {style.label}
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
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="spinning" />
                    AI Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Asset
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Generations */}
          {generations.length > 0 && (
            <div className="studio-panel">
              <div className="panel-header">
                <Loader2 size={18} className="panel-icon" />
                <h2>Active Generations</h2>
              </div>
              <div className="generations-list">
                {generations.slice(0, 3).map((gen) => (
                  <div key={gen.id} className="generation-item">
                    <div className="generation-type">{gen.type}</div>
                    <div className="generation-status">{getGenerationStatusText(gen.status)}</div>
                    <div className="generation-progress-bar">
                      <div 
                        className="generation-progress-fill"
                        style={{ width: `${gen.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                {generations.length > 3 && (
                  <div className="generations-more">
                    + {generations.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

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
            {assets.some(a => a.aiGeneration) && (
              <span className="ai-badge">AI Generated</span>
            )}
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
                    {asset.aiGeneration && (
                      <div className="ai-generated-badge" title="AI Generated">
                        ✨
                      </div>
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
                    {selectedAsset.aiGeneration && (
                      <span className="ai-tag">AI Generated</span>
                    )}
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
                  <h3>Original Prompt</h3>
                  <p className="prompt-text">{selectedAsset.prompt}</p>
                </div>
              )}

              {selectedAsset.aiGeneration && (
                <div className="detail-section">
                  <h3>AI Generation Details</h3>
                  <div className="ai-details-grid">
                    <div className="detail-item">
                      <label>Style</label>
                      <span>{selectedAsset.aiGeneration.style}</span>
                    </div>
                    <div className="detail-item">
                      <label>Duration</label>
                      <span>{selectedAsset.aiGeneration.duration}ms</span>
                    </div>
                    <div className="detail-item">
                      <label>Generation ID</label>
                      <span className="generation-id">{selectedAsset.aiGeneration.generationId}</span>
                    </div>
                  </div>
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
};

export default AssetStudioPage;
export { AssetStudioPage };