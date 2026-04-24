/**
 * @clawgame/web - Asset Studio Page
 * AI-powered asset generation and management for game development.
 * Orchestrates sub-components: GeneratePanel, GenerationTracker, FilterPanel, AssetGrid, AssetDetailPanel, MediaForgeToolbar.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata, type AssetType, type GenerationStatus } from '../api/client';
import { generativeMediaAPI } from '../api/mockGenerativeClient';
import { useToast } from '../components/Toast';
import { RefreshCw } from 'lucide-react';
import { logger } from '../utils/logger';
import { GeneratePanel } from '../components/asset-studio/GeneratePanel';
import { GenerationTracker } from '../components/asset-studio/GenerationTracker';
import { FilterPanel } from '../components/asset-studio/FilterPanel';
import { AssetGrid } from '../components/asset-studio/AssetGrid';
import { AssetDetailPanel } from '../components/asset-studio/AssetDetailPanel';
import { AssetSuggestions } from '../components/AssetSuggestions';
import { AssetProcessingToolbar } from '../components/AssetProcessingToolbar';
import { MediaForgeToolbar } from '../components/generative-media/MediaForgeToolbar';
import '../asset-processing.css';

const ASSET_TYPES = ['sprite', 'tileset', 'texture', 'icon', 'audio', 'background', 'effect'] as AssetType[];

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'library', label: 'Asset Library', icon: '📦' },
  { id: 'generate', label: 'Generate AI', icon: '🎨' },
  { id: 'media-forge', label: 'Media Forge', icon: '🔮' },
  { id: 'processing', label: 'Processing', icon: '⚙️' },
];

export const AssetStudioPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('library');

  // Asset state
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AssetType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Generation state
  const [generations, setGenerations] = useState<GenerationStatus[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<GenerationStatus | null>(null);

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Stable callbacks to avoid stale closures
  const loadAssets = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const list = await api.listAssets(projectId, {
        type: filter || undefined,
        search: searchQuery || undefined,
        limit: '50',
      });
      setAssets(list);
    } catch (error) {
      logger.error('Failed to load assets:', error);
      showToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, filter, searchQuery, showToast]);

  const handleGenerateAsset = useCallback(async (request: {
    prompt: string;
    type: AssetType;
    style?: string;
    width?: number;
    height?: number;
    count?: number;
  }) => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      // Mock generation for now - bypass API compilation
      const mockAssets = await generativeMediaAPI.generateImage({
        type: request.type as any,
        prompt: request.prompt,
        style: request.style || 'pixel-art',
        width: request.width,
        height: request.height,
        count: request.count || 1,
      });
      
      // Add generated assets to the list
      const newAssets = mockAssets.assets.map(asset => ({
        ...asset,
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      setAssets(prev => [...newAssets, ...prev]);
      
      showToast(`Generated ${newAssets.length} ${request.type} asset(s)`, 'success');
      
      // Select the first generated asset
      if (newAssets.length > 0) {
        setSelectedAsset(newAssets[0]);
        // Switch to library tab to show the generated asset
        setActiveTab('library');
      }
      
    } catch (error) {
      logger.error('Failed to generate asset:', error);
      showToast('Failed to generate asset', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, showToast]);

  const handleAssetGenerated = useCallback((asset: any) => {
    setSelectedAsset(asset);
    showToast('Asset generated and selected', 'success');
  }, [showToast]);

  useEffect(() => {
    loadAssets();
    
    // Set up polling for active generations
    if (activeGeneration && activeGeneration.status === 'generating') {
      isPollingRef.current = true;
      pollTimerRef.current = setInterval(async () => {
        try {
          const status = await generativeMediaAPI.getStatus(activeGeneration.id);
          const apiStatus: GenerationStatus = {
            id: status.id,
            projectId: projectId || '',
            type: 'sprite',
            prompt: status.message || '',
            status: status.status === 'processing' ? 'generating' : status.status,
            progress: status.progress,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setActiveGeneration(apiStatus);
          
          if (status.status === 'completed') {
            isPollingRef.current = false;
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
            }
            // Persist the generated asset to project storage
            try {
              const outputData = (status as any).output || (status as any).result;
              if (outputData) {
                await api.uploadAsset(projectId || '', {
                  name: `ai-${apiStatus.id || Date.now()}`,
                  type: apiStatus.type || 'sprite',
                  content: typeof outputData === 'string' ? outputData : JSON.stringify(outputData),
                  mimeType: 'image/svg+xml',
                });
                logger.info('AI-generated asset persisted to project storage');
              }
            } catch (persistErr) {
              logger.warn('Failed to persist AI asset to storage:', persistErr);
            }
          } else if (status.status === 'failed') {
            isPollingRef.current = false;
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
            }
          }
        } catch (error) {
          logger.error('Failed to check generation status:', error);
          isPollingRef.current = false;
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
          }
        }
      }, 2000);
    }
    
    return () => {
      isPollingRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [loadAssets, activeGeneration]);

  const refreshAssets = () => {
    loadAssets();
  };

  return (
    <div className="asset-studio-page h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asset Studio</h1>
            <p className="text-muted-foreground">AI-powered game asset creation and management</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm"
            >
              Upload Asset
            </button>
            <button
              onClick={refreshAssets}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-md disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-4 border-b">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'library' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <FilterPanel
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filter={filter}
                onFilterChange={setFilter}
                onUploadClick={() => setShowUploadModal(true)}
                assetTypes={ASSET_TYPES}
              />
            </div>
            
            {/* Asset Grid */}
            <AssetGrid
              assets={assets}
              loading={loading}
              selectedAsset={selectedAsset}
              onSelect={setSelectedAsset}
              searchQuery={searchQuery}
              filter={filter}
            />
          </div>
        )}
        
        {activeTab === 'generate' && (
          <div className="space-y-4">
            <GeneratePanel
              onGenerationStarted={(generation) => {
                setActiveGeneration(generation);
                setGenerations((prev) => [generation, ...prev]);
              }}
            />
            
            <GenerationTracker
              generations={generations}
              activeGeneration={activeGeneration}
            />
            
            <AssetSuggestions />
          </div>
        )}
        
        {activeTab === 'media-forge' && (
          <MediaForgeToolbar
            projectId={projectId || ''}
            onAssetGenerated={handleAssetGenerated}
          />
        )}
        
        {activeTab === 'processing' && (
          <div className="space-y-4">
            <AssetProcessingToolbar
              projectId={projectId || ''}
              selectedAssetPath={selectedAsset?.url || null}
              onProcessed={refreshAssets}
            />
          </div>
        )}
      </div>
      
      {/* Asset Detail Panel */}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          projectId={projectId}
          onDelete={async (id) => {
            if (!projectId) return;
            await api.deleteAsset(projectId, id);
            setSelectedAsset(null);
            refreshAssets();
          }}
        />
      )}
    </div>
  );
};

export default AssetStudioPage;
