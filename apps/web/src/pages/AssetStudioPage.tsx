/**
 * @clawgame/web - Asset Studio Page
 * AI-powered asset generation and management for game development.
 * Orchestrates sub-components: GeneratePanel, GenerationTracker, FilterPanel, AssetGrid, AssetDetailPanel.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { AssetProcessingToolbar } from '../components/AssetProcessingToolbar';
import '../asset-processing.css';

const ASSET_TYPES = ['sprite', 'tileset', 'texture', 'icon', 'audio', 'background'] as AssetType[];

const AssetStudioPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

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
      });
      setAssets(list);
    } catch (error: any) {
      logger.error('Failed to load assets:', error);
      showToast({ type: 'error', message: `Failed to load assets: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [projectId, filter, searchQuery, showToast]);

  const pollGenerations = useCallback(async () => {
    if (!projectId || isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const result = await api.pollGenerations(projectId);
      if (result.created.length > 0) {
        await loadAssets();
        showToast({ type: 'success', message: `✅ ${result.created.length} asset(s) created` });
      }
      if (result.errors.length > 0) {
        showToast({ type: 'error', message: `❌ ${result.errors.length} generation(s) failed` });
      }
      // Refresh generation list — but do NOT re-trigger pollGenerations from here
      try {
        const list = await api.getGenerations(projectId);
        setGenerations(list);
      } catch (err: any) {
        logger.error('Failed to refresh generations after poll:', err);
      }
    } catch (error: any) {
      logger.error('Failed to poll generations:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [projectId, loadAssets, showToast]);

  const loadGenerations = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await api.getGenerations(projectId);
      setGenerations(list);
      // NOTE: Do NOT call pollGenerations here — that was causing infinite recursion.
      // Polling is handled by the interval timer and explicit user actions only.
    } catch (error: any) {
      logger.error('Failed to load generations:', error);
    }
  }, [projectId]);

  // Load assets on mount and when filters change
  useEffect(() => {
    loadAssets();
    loadGenerations();

    pollTimerRef.current = setInterval(() => {
      // Only poll if there are active (non-completed) generations
      setGenerations(current => {
        const hasActive = current.some(g => g.status === 'generating' || g.status === 'pending');
        if (hasActive) pollGenerations();
        return current;
      });
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadAssets, loadGenerations, pollGenerations]);

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
    loadGenerations();
    showToast({ type: 'info', message: '🔄 Refreshing assets...' });
  };

  const handleGenerationStarted = (gen: GenerationStatus) => {
    setGenerations(prevGens => {
      const exists = prevGens.some(g => g.id === gen.id);
      if (!exists) {
        return [gen, ...prevGens];
      }
      return prevGens;
    });
    setActiveGeneration(gen);

    // If generation is already completed (synchronous), immediately refresh assets
    if (gen.status === 'completed') {
      setTimeout(() => {
        loadAssets();
        showToast({ type: 'success', message: `✅ Generated asset successfully!` });
      }, 500);
    }
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

        {/* Processing Tools */}
        <AssetProcessingToolbar projectId={projectId || ""} selectedAssetPath={selectedAsset?.url || null} />

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
