/**
 * @clawgame/web - Asset Studio Page
 * AI-powered asset generation and management for game development.
 * Orchestrates sub-components: GeneratePanel, GenerationTracker, FilterPanel, AssetGrid, AssetDetailPanel.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata, type AssetType, type GenerationStatus } from '../api/client';
import { useToast } from '../components/Toast';
import { RefreshCw } from 'lucide-react';
import { logger } from '../utils/logger';
import { GeneratePanel } from '../components/asset-studio/GeneratePanel';
import { GenerationTracker } from '../components/asset-studio/GenerationTracker';
import { FilterPanel } from '../components/asset-studio/FilterPanel';
import { AssetGrid } from '../components/asset-studio/AssetGrid';
import { AssetDetailPanel } from '../components/asset-studio/AssetDetailPanel';
import { AssetSuggestions } from '../components/AssetSuggestions';

const ASSET_TYPES = ['sprite', 'tileset', 'texture', 'icon', 'audio', 'background'] as AssetType[];

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
  const [generations, setGenerations] = useState<GenerationStatus[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<GenerationStatus | null>(null);

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load assets on mount and when filters change
  useEffect(() => {
    loadAssets();
    loadGenerations();

    pollTimerRef.current = setInterval(() => {
      if (generations.length > 0) checkGenerationProgress();
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [projectId, filter, searchQuery]);

  const loadAssets = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const list = await api.listAssets(projectId, {
        type: filter || undefined,
        search: searchQuery || undefined,
      });
      setAssets(list);
    } catch (error: any) {
      logger.error('Failed to load assets:', error);
      showToast({ type: 'error', message: `Failed to load assets: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadGenerations = async () => {
    if (!projectId) return;
    try {
      const list = await api.getGenerations(projectId);
      setGenerations(list);
      const completed = list.filter(g => g.status === 'completed' && !g.result?.svg);
      if (completed.length > 0) pollGenerations();
    } catch (error: any) {
      logger.error('Failed to load generations:', error);
    }
  };

  const checkGenerationProgress = async () => {
    if (!projectId || generations.length === 0) return;
    try {
      const updated = await api.getGenerations(projectId);
      setGenerations(updated);
      const active = updated.find(g => g.status === 'generating');
      if (active) setActiveGeneration(active);

      const newCompleted = updated.filter(
        g => g.status === 'completed' && g.result?.svg && generations.find(og => og.id === g.id)?.status !== 'completed'
      );
      if (newCompleted.length > 0) pollGenerations();
    } catch (error: any) {
      logger.error('Failed to check generation progress:', error);
    }
  };

  const pollGenerations = async () => {
    if (!projectId) return;
    try {
      const result = await api.pollGenerations(projectId);
      if (result.created.length > 0) {
        showToast({ type: 'success', message: `✅ Generated ${result.created.length} new assets!` });
        loadAssets();
      }
      if (result.errors.length > 0) {
        showToast({ type: 'error', message: `❌ ${result.errors.length} generation(s) failed` });
      }
      loadGenerations();
    } catch (error: any) {
      logger.error('Failed to poll generations:', error);
    }
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!projectId) return;
    if (!confirm(`Delete "${assetName}"? This cannot be undone.`)) return;
    try {
      await api.deleteAsset(projectId, assetId);
      setAssets(currentAssets => currentAssets.filter(a => a.id !== assetId));
      if (selectedAsset?.id === assetId) setSelectedAsset(null);
      showToast({ type: 'success', message: `Deleted "${assetName}"` });
    } catch (error: any) {
      logger.error('Failed to delete asset:', error);
      showToast({ type: 'error', message: `Failed to delete asset: ${error.message}` });
    }
  };

  const handleRefreshAssets = () => {
    loadAssets();
    showToast({ type: 'info', message: '🔄 Refreshing assets...' });
  };

  const handleGenerationStarted = (gen: GenerationStatus) => {
    setGenerations(prevGens => [gen, ...prevGens]);
    setActiveGeneration(gen);
  };

  // Filter assets locally for grid display
  const filteredAssets = assets.filter(asset => {
    if (filter && asset.type !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.prompt?.toLowerCase().includes(q) ||
        asset.tags?.some(tag => tag.toLowerCase().includes(q))
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
          <button className="icon-button" onClick={handleRefreshAssets} title="Refresh assets">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>
      {/* AI-powered asset suggestions */}
      <AssetSuggestions />

      <div className="asset-studio-container">
        {/* Left Sidebar: Generation + Filters */}
        <div className="studio-sidebar">
          <GenerationTracker activeGeneration={activeGeneration} generations={generations} />
          <GeneratePanel onGenerationStarted={handleGenerationStarted} />
          <FilterPanel
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
            onUploadClick={() => setShowUploadModal(true)}
            assetTypes={ASSET_TYPES}
          />
        </div>

        {/* Center: Asset Grid */}
        <AssetGrid
          assets={filteredAssets}
          selectedAsset={selectedAsset}
          onSelect={setSelectedAsset}
          loading={loading}
          searchQuery={searchQuery}
          filter={filter}
        />

        {/* Right: Asset Details */}
        <AssetDetailPanel
          asset={selectedAsset}
          projectId={projectId}
          onDelete={handleDeleteAsset}
        />
      </div>
    </div>
  );
};

export default AssetStudioPage;
export { AssetStudioPage };
