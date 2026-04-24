/**
 * Generative Media Forge Toolbar
 * M11: AI-powered media generation workflow for game assets
 * Real API implementation connecting to backend generative service
 */

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../Toast';
import { Wand2, Download, History, Package, Sparkles, Loader2 } from 'lucide-react';
import { generativeMediaAPI, type GenerationRequest, type GenerationStatus } from '../../api/generativeMediaClient';
import type { AssetType } from '../../api/types';

interface MediaForgeProps {
  projectId: string;
  onAssetGenerated: (asset: any) => void;
}

const MEDIA_TYPES = [
  { value: 'character' as AssetType, label: 'Character', icon: '👤' },
  { value: 'enemy' as AssetType, label: 'Enemy', icon: '👹' },
  { value: 'prop' as AssetType, label: 'Prop', icon: '📦' },
  { value: 'ui' as AssetType, label: 'UI Element', icon: '🎨' },
  { value: 'background' as AssetType, label: 'Background', icon: '🌅' },
  { value: 'texture' as AssetType, label: 'Texture', icon: '🎭' },
  { value: 'sprite' as AssetType, label: 'Sprite Sheet', icon: '🎮' },
  { value: 'icon' as AssetType, label: 'Icon', icon: '🔲' },
];

const ANIMATION_TYPES = [
  { value: 'idle', label: 'Idle', description: 'Character standing still' },
  { value: 'walk', label: 'Walk', description: 'Character walking movement' },
  { value: 'run', label: 'Run', description: 'Character running movement' },
  { value: 'attack', label: 'Attack', description: 'Character performing attack' },
  { value: 'hurt', label: 'Hurt', description: 'Character reacting to damage' },
  { value: 'death', label: 'Death', description: 'Character defeat animation' },
];

export function MediaForgeToolbar({ projectId, onAssetGenerated }: MediaForgeProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const [generationRequest, setGenerationRequest] = useState<GenerationRequest>({
    projectId,
    type: 'character',
    prompt: '',
    style: 'pixel-art',
    width: 64,
    height: 64,
    count: 1,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<any[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [generationJobs, setGenerationJobs] = useState<GenerationStatus[]>([]);
  const [stylePresets, setStylePresets] = useState<any[]>([]);
  const [animationTypes, setAnimationTypes] = useState<any[]>([]);
  const [jobPolling, setJobPolling] = useState<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // Load media types and presets on mount
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      // Load style presets
      const stylesResult = await generativeMediaAPI.getStylePresets();
      if (stylesResult.success && stylesResult.data) {
        setStylePresets(stylesResult.data.presets);
      }

      // Load animation types
      const animationsResult = await generativeMediaAPI.getAnimationTypes();
      if (animationsResult.success && animationsResult.data) {
        setAnimationTypes(animationsResult.data.animations);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handleGenerate = async () => {
    if (!promptInput.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const request = {
        ...generationRequest,
        prompt: promptInput,
      };

      const result = await generativeMediaAPI.generateAsset(request);
      
      if (result.success && result.data) {
        // Add to generated assets
        const newAsset = {
          ...result.data,
          id: `generated_${Date.now()}`,
          name: `${generationRequest.type}-${Date.now()}`,
          type: generationRequest.type,
          url: result.data.content,
          size: 1024,
          mimeType: `image/${generationRequest.format || 'png'}`,
          createdAt: new Date().toISOString(),
          tags: [generationRequest.type, 'generated'],
          status: 'generated',
          generationData: {
            model: result.data.metadata.model,
            confidence: result.data.metadata.confidence,
            parameters: request,
          },
        };

        setGeneratedAssets(prev => [newAsset, ...prev]);
        onAssetGenerated(newAsset);
        showToast('Asset generated successfully!', 'success');
        
        // Start polling for job status
        if (result.generationId) {
          pollJobStatus(result.generationId);
        }
        
        // Clear form
        setPromptInput('');
      } else {
        showToast(result.error || 'Generation failed', 'error');
      }
    } catch (error) {
      showToast('Generation failed', 'error');
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    if (jobPolling) {
      clearInterval(jobPolling);
    }

    const poll = async () => {
      try {
        const result = await generativeMediaAPI.getJobStatus(jobId);
        if (result.success && result.data) {
          setGenerationJobs(prev => [result.data!, ...prev.filter(j => j.id !== jobId)]);
          
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            if (jobPolling) {
              clearInterval(jobPolling);
              setJobPolling(null);
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
        if (jobPolling) {
          clearInterval(jobPolling);
          setJobPolling(null);
        }
      }
    };

    // Initial poll
    await poll();
    
    // Set up interval polling
    const interval = setInterval(poll, 2000);
    setJobPolling(interval);
  };

  const handleSpriteSheetGeneration = async () => {
    if (!promptInput.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await generativeMediaAPI.generateSpriteSheet({
        projectId,
        type: generationRequest.type,
        prompt: promptInput,
        style: generationRequest.style || 'pixel-art',
        width: generationRequest.width || 64,
        height: generationRequest.height || 64,
        frames: 4,
        animationType: 'idle' as const,
      });

      if (result.success && result.data) {
        // Convert sprite sheet results to individual assets
        const frameAssets = result.data.map((frame, index) => ({
          id: `sprite_${Date.now()}_${index}`,
          name: `${generationRequest.type}-frame-${index}`,
          type: 'sprite',
          url: frame.content,
          size: 512,
          mimeType: 'image/png',
          createdAt: new Date().toISOString(),
          tags: ['sprite', 'animation', generationRequest.type],
          status: 'generated',
          generationData: {
            model: frame.metadata.model,
            confidence: frame.metadata.confidence,
            parameters: { frame: index },
          },
        }));

        setGeneratedAssets(prev => [...frameAssets, ...prev]);
        onAssetGenerated(frameAssets[0]);
        showToast(`Generated ${frameAssets.length} sprite frames!`, 'success');
        
        // Clear form
        setPromptInput('');
      } else {
        showToast(result.error || 'Sprite sheet generation failed', 'error');
      }
    } catch (error) {
      showToast('Sprite sheet generation failed', 'error');
      console.error('Sprite sheet generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssetPackGeneration = async () => {
    if (!promptInput.trim()) {
      showToast('Please enter a game concept', 'error');
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await generativeMediaAPI.generateAssetPack({
        projectId,
        gameConcept: promptInput,
        genre: 'fantasy',
        artStyle: generationRequest.style || 'pixel-art',
        includeCharacters: true,
        includeEnemies: true,
        includeProps: true,
        includeBackgrounds: false,
        countPerType: 2,
      });

      if (result.success && result.data) {
        const packAssets = result.data.map((asset, index) => ({
          id: `pack_${Date.now()}_${index}`,
          name: `${asset.metadata.type}-${Date.now()}-${index}`,
          type: asset.metadata.type,
          url: asset.content,
          size: 1024,
          mimeType: 'image/png',
          createdAt: new Date().toISOString(),
          tags: [asset.metadata.type, 'pack', 'generated'],
          status: 'generated',
          generationData: {
            model: asset.metadata.model,
            confidence: asset.metadata.confidence,
            parameters: asset.metadata,
          },
        }));

        setGeneratedAssets(prev => [...packAssets, ...prev]);
        onAssetGenerated(packAssets[0]);
        showToast(`Generated ${packAssets.length} asset pack items!`, 'success');
        
        // Clear form
        setPromptInput('');
      } else {
        showToast(result.error || 'Asset pack generation failed', 'error');
      }
    } catch (error) {
      showToast('Asset pack generation failed', 'error');
      console.error('Asset pack generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="media-forge-toolbar p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-xl font-bold">Generative Media Forge</h2>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2">
          Real AI
        </span>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'generate' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          🎨 Generate
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'presets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📚 Presets
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'batch' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📦 Batch Pack
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Media Type</label>
              <select 
                value={generationRequest.type} 
                onChange={(e) => setGenerationRequest(prev => ({ ...prev, type: e.target.value as AssetType }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                {MEDIA_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Style Preset</label>
              <select 
                value={generationRequest.style} 
                onChange={(e) => setGenerationRequest(prev => ({ ...prev, style: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                {stylePresets.map(preset => (
                  <option key={preset.value} value={preset.value}>
                    <span className="flex items-center gap-2">
                      <span className="text-xs bg-secondary px-2 py-1 rounded">{preset.category}</span>
                      <span>{preset.label}</span>
                    </span>
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Width</label>
              <input
                type="number"
                value={generationRequest.width || 64}
                onChange={(e) => setGenerationRequest(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                min={16}
                max={512}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Height</label>
              <input
                type="number"
                value={generationRequest.height || 64}
                onChange={(e) => setGenerationRequest(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                min={16}
                max={512}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Count</label>
            <input
              type="number"
              value={generationRequest.count || 1}
              onChange={(e) => setGenerationRequest(prev => ({ ...prev, count: parseInt(e.target.value) }))}
              min={1}
              max={10}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Prompt</label>
            <textarea
              placeholder={`Describe the ${generationRequest.type} you want to generate...`}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md resize-none"
            />
          </div>
          
          <button 
            onClick={handleGenerate} 
            disabled={!promptInput.trim() || isGenerating}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate Asset
              </>
            )}
          </button>
        </div>
      )}
      
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 gap-4">
          {MEDIA_TYPES.map(type => (
            <div 
              key={type.value} 
              className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{type.icon}</div>
                <h3 className="font-medium">{type.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-generated {type.label.toLowerCase()} assets
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTab === 'batch' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Complete Asset Pack Generator</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Generate a complete set of assets for your game concept using AI
            </p>
            <textarea
              placeholder="Describe your game concept (e.g., 'A fantasy platformer with dragons and castles')..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md resize-none"
            />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Art Style</label>
                <select 
                  value={generationRequest.style} 
                  onChange={(e) => setGenerationRequest(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {stylePresets.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Items per Type</label>
                <input
                  type="number"
                  value="2"
                  min="1"
                  max="5"
                  className="w-full px-3 py-2 border rounded-md"
                  readOnly
                />
              </div>
            </div>
            <button 
              onClick={handleAssetPackGeneration} 
              disabled={!promptInput.trim() || isGenerating}
              className="w-full mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Asset Pack...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Generate Complete Asset Pack
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'history' && (
        <div className="space-y-2">
          {generatedAssets.map(asset => (
            <div key={asset.id} className="p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <img 
                  src={asset.url} 
                  alt={asset.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{asset.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="bg-secondary px-2 py-1 rounded text-xs">{asset.type}</span>
                    <span>{asset.width}x{asset.height}</span>
                    <span>Just now</span>
                  </div>
                </div>
                <button className="px-3 py-1 border rounded-md hover:bg-muted text-sm">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {generatedAssets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No generated assets yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
