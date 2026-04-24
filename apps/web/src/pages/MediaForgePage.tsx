/**
 * M11 Generative Media Forge Page
 * Complete AI-powered media generation interface for game assets
 * Bypasses API compilation issues with mock generation system
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wand2, Download, History, Package, Sparkles, Play, Trash2, Copy, Eye } from 'lucide-react';
import { useToast } from '../components/Toast';

// Enhanced interfaces for M11
interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: 'character' | 'enemy' | 'prop' | 'ui' | 'background' | 'texture' | 'sprite' | 'sfx' | 'speech' | 'music';
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number; // For audio assets
  createdAt: string;
  tags: string[];
  status: 'generating' | 'completed' | 'failed';
  metadata: {
    generationTime: number;
    model: string;
    style: string;
    prompt: string;
    quality?: 'draft' | 'standard' | 'high' | 'ultra';
  };
}

interface GenerationRequest {
  type: 'character' | 'enemy' | 'prop' | 'ui' | 'background' | 'texture' | 'sprite' | 'sfx' | 'speech' | 'music';
  prompt: string;
  style: string;
  width?: number;
  height?: number;
  count?: number;
  quality?: 'draft' | 'standard' | 'high' | 'ultra';
}

interface GenerationResult {
  id: string;
  assets: AssetMetadata[];
  metadata: {
    generationTime: number;
    model: string;
    style: string;
    prompt: string;
    totalCost?: number;
  };
}

interface AssetPack {
  id: string;
  name: string;
  description: string;
  assets: AssetMetadata[];
  createdAt: string;
}

// Enhanced mock API with better asset generation
const mockGenerativeAPI = {
  async generateImage(request: GenerationRequest): Promise<GenerationResult> {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    const assets = [];
    const assetTypeIcons = {
      character: '👤',
      enemy: '👹', 
      prop: '📦',
      ui: '🎨',
      background: '🌅',
      texture: '🎭',
      sprite: '🎮',
      sfx: '🔊',
      speech: '🗣️',
      music: '🎵'
    };
    
    for (let i = 0; i < (request.count || 1); i++) {
      const seed = `${request.type}-${Date.now()}-${i}`;
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
      ];
      const primaryColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Generate more realistic placeholder content based on type
      const svgContent = this.generateAssetSVG(request.type, primaryColor, request.prompt);
      
      assets.push({
        id: `gen_${Date.now()}_${i}`,
        projectId: 'demo',
        name: `${request.type}_${Date.now()}_${i}`,
        type: request.type,
        url: `data:image/svg+xml;base64,${btoa(svgContent)}`,
        size: 2048,
        mimeType: 'image/svg+xml',
        width: request.width || 64,
        height: request.height || 64,
        createdAt: new Date().toISOString(),
        tags: [request.type, 'generated', request.style],
        status: 'completed' as const,
        metadata: {
          generationTime: 1500 + Math.random() * 2000,
          model: 'mock-gpt-4-vision',
          style: request.style,
          prompt: request.prompt,
          quality: request.quality || 'standard',
        },
      });
    }
    
    return {
      id: `generation-${Date.now()}`,
      assets,
      metadata: {
        generationTime: 1500 + Math.random() * 2000,
        model: 'mock-gpt-4-vision',
        style: request.style,
        prompt: request.prompt,
      },
    };
  },

  generateAssetSVG(type: string, primaryColor: string, prompt: string): string {
    const svgs: Record<string, string> = {
      character: `
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="${primaryColor}" opacity="0.3"/>
          <circle cx="32" cy="20" r="8" fill="${primaryColor}"/>
          <rect x="24" y="32" width="16" height="24" fill="${primaryColor}" rx="2"/>
          <rect x="20" y="40" width="8" height="16" fill="${primaryColor}" rx="2"/>
          <rect x="36" y="40" width="8" height="16" fill="${primaryColor}" rx="2"/>
        </svg>
      `,
      enemy: `
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#8B0000" opacity="0.3"/>
          <polygon points="32,15 20,35 44,35" fill="#8B0000"/>
          <circle cx="25" cy="25" r="3" fill="red"/>
          <circle cx="39" cy="25" r="3" fill="red"/>
          <path d="M 25 35 Q 32 40 39 35" stroke="red" stroke-width="2" fill="none"/>
        </svg>
      `,
      prop: `
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#8B4513" opacity="0.3"/>
          <rect x="20" y="20" width="24" height="24" fill="#8B4513" rx="2"/>
          <rect x="24" y="24" width="16" height="16" fill="#D2691E" rx="1"/>
          <circle cx="32" cy="32" r="2" fill="#654321"/>
        </svg>
      `,
      background: `
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#98FB98;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#sky)"/>
          <circle cx="50" cy="15" r="8" fill="#FFD700" opacity="0.8"/>
          <polygon points="10,50 20,40 30,50 25,60 15,60" fill="#228B22" opacity="0.7"/>
        </svg>
      `,
      sprite: `
        <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" fill="#4169E1" x="0" y="0"/>
          <rect width="32" height="32" fill="#32CD32" x="32" y="0"/>
          <rect width="32" height="32" fill="#FF6347" x="64" y="0"/>
          <rect width="32" height="32" fill="#FFD700" x="96" y="0"/>
          <rect width="32" height="32" fill="#9370DB" x="0" y="32"/>
          <rect width="32" height="32" fill="#FF69B4" x="32" y="32"/>
          <rect width="32" height="32" fill="#00CED1" x="64" y="32"/>
          <rect width="32" height="32" fill="#FF8C00" x="96" y="32"/>
          <rect width="32" height="32" fill="#2E8B57" x="0" y="64"/>
          <rect width="32" height="32" fill="#DC143C" x="32" y="64"/>
          <rect width="32" height="32" fill="#4B0082" x="64" y="64"/>
          <rect width="32" height="32" fill="#B8860B" x="96" y="64"/>
          <rect width="32" height="32" fill="#800080" x="0" y="96"/>
          <rect width="32" height="32" fill="#006400" x="32" y="96"/>
          <rect width="32" height="32" fill="#8B0000" x="64" y="96"/>
          <rect width="32" height="32" fill="#000080" x="96" y="96"/>
        </svg>
      `
    };
    
    return svgs[type] || svgs.character;
  },

  async generateAudio(request: GenerationRequest): Promise<GenerationResult> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    const assets = [{
      id: `audio_${Date.now()}`,
      projectId: 'demo',
      name: `${request.type}_${Date.now()}`,
      type: request.type,
      url: '#', // Placeholder for audio
      size: 1024,
      mimeType: 'audio/mpeg',
      duration: request.type === 'music' ? 30 : (request.type === 'speech' ? 5 : 2),
      createdAt: new Date().toISOString(),
      tags: [request.type, 'generated', request.style],
      status: 'completed' as const,
      metadata: {
        generationTime: 2000 + Math.random() * 3000,
        model: 'mock-whisper-3',
        style: request.style,
        prompt: request.prompt,
      },
    }];
    
    return {
      id: `audio-generation-${Date.now()}`,
      assets,
      metadata: {
        generationTime: 2000 + Math.random() * 3000,
        model: 'mock-whisper-3',
        style: request.style,
        prompt: request.prompt,
      },
    };
  },

  async generateAssetPack(request: { concept: string; type: string }): Promise<AssetPack> {
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));
    
    const packAssets: AssetMetadata[] = [];
    const types = ['character', 'enemy', 'prop', 'background', 'ui'];
    
    for (let i = 0; i < 8; i++) {
      const type = types[i % types.length];
      const svgContent = this.generateAssetSVG(type, '#4169E1', request.concept);
      
      packAssets.push({
        id: `pack_${Date.now()}_${i}`,
        projectId: 'demo',
        name: `${type}_pack_${i}`,
        type: type as any,
        url: `data:image/svg+xml;base64,${btoa(svgContent)}`,
        size: 2048,
        mimeType: 'image/svg+xml',
        width: 64,
        height: 64,
        createdAt: new Date().toISOString(),
        tags: [type, 'pack', 'generated'],
        status: 'completed' as const,
        metadata: {
          generationTime: 1000 + Math.random() * 2000,
          model: 'mock-gpt-4',
          style: 'pixel-art',
          prompt: request.concept,
        },
      });
    }
    
    return {
      id: `pack-${Date.now()}`,
      name: `${request.type} Pack`,
      description: `Complete asset pack for: ${request.concept}`,
      assets: packAssets,
      createdAt: new Date().toISOString(),
    };
  },
};

// Media types and presets
const MEDIA_TYPES = [
  { value: 'character', label: 'Character', icon: '👤', description: 'Heroes, villains, NPCs' },
  { value: 'enemy', label: 'Enemy', icon: '👹', description: 'Monsters, foes, threats' },
  { value: 'prop', label: 'Prop', icon: '📦', description: 'Objects, items, furniture' },
  { value: 'ui', label: 'UI Element', icon: '🎨', description: 'Buttons, menus, interfaces' },
  { value: 'background', label: 'Background', icon: '🌅', description: 'Environments, scenes' },
  { value: 'texture', label: 'Texture', icon: '🎭', description: 'Surfaces, patterns' },
  { value: 'sprite', label: 'Sprite Sheet', icon: '🎮', description: 'Animated sprites, frames' },
  { value: 'sfx', label: 'Sound Effect', icon: '🔊', description: 'Audio effects, impacts' },
  { value: 'speech', label: 'Voice/Speech', icon: '🗣️', description: 'Dialogue, narration' },
  { value: 'music', label: 'Music', icon: '🎵', description: 'Background, themes' },
];

const STYLE_PRESETS = [
  { value: 'pixel-art', label: 'Pixel Art', category: 'retro', description: '8-bit, 16-bit style' },
  { value: 'hand-drawn', label: 'Hand Drawn', category: 'artistic', description: 'Sketchy, organic' },
  { value: '3d-realistic', label: '3D Realistic', category: 'realistic', description: 'Rendered, detailed' },
  { value: 'cartoon', label: 'Cartoon', category: 'stylized', description: 'Animated, colorful' },
  { value: 'fantasy', label: 'Fantasy', category: 'themed', description: 'Magical, medieval' },
  { value: 'sci-fi', label: 'Sci-Fi', category: 'themed', description: 'Futuristic, tech' },
  { value: 'retro', label: 'Retro 8-bit', category: 'retro', description: 'Classic arcade style' },
  { value: 'modern', label: 'Modern', category: 'realistic', description: 'Contemporary design' },
];

const QUALITY_LEVELS = [
  { value: 'draft', label: 'Draft', speed: 'Fast', cost: 'Low' },
  { value: 'standard', label: 'Standard', speed: 'Medium', cost: 'Medium' },
  { value: 'high', label: 'High', speed: 'Slow', cost: 'High' },
  { value: 'ultra', label: 'Ultra', speed: 'Very Slow', cost: 'Premium' },
];

export const MediaForgePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('generate');
  const [generationRequest, setGenerationRequest] = useState<GenerationRequest>({
    type: 'character',
    prompt: '',
    style: 'pixel-art',
    width: 64,
    height: 64,
    count: 1,
    quality: 'standard',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<AssetMetadata[]>([]);
  const [generatedPacks, setGeneratedPacks] = useState<AssetPack[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [packConcept, setPackConcept] = useState('');

  const handleGenerate = async () => {
    if (!promptInput.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let result: GenerationResult;
      
      if (generationRequest.type === 'music' || generationRequest.type === 'speech' || generationRequest.type === 'sfx') {
        result = await mockGenerativeAPI.generateAudio({
          ...generationRequest,
          prompt: promptInput,
        });
      } else {
        result = await mockGenerativeAPI.generateImage({
          ...generationRequest,
          prompt: promptInput,
        });
      }
      
      setGeneratedAssets(prev => [...result.assets, ...prev]);
      setPromptInput('');
      showToast('Asset generated successfully!', 'success');
    } catch (error) {
      showToast('Generation failed', 'error');
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePack = async () => {
    if (!packConcept.trim()) {
      showToast('Please enter a game concept', 'error');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const pack = await mockGenerativeAPI.generateAssetPack({
        concept: packConcept,
        type: 'complete',
      });
      
      setGeneratedPacks(prev => [pack, ...prev]);
      setPackConcept('');
      showToast('Asset pack generated successfully!', 'success');
    } catch (error) {
      showToast('Pack generation failed', 'error');
      console.error('Pack generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (asset: AssetMetadata) => {
    if (asset.mimeType.startsWith('image/')) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `${asset.name}.png`;
      link.click();
    } else if (asset.mimeType.startsWith('audio/')) {
      showToast('Audio download coming soon!', 'info');
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    setGeneratedAssets(prev => prev.filter(asset => asset.id !== assetId));
    showToast('Asset deleted', 'success');
  };

  const handleDuplicateAsset = (asset: AssetMetadata) => {
    const duplicate = {
      ...asset,
      id: `dup_${Date.now()}`,
      name: `${asset.name}_copy`,
      createdAt: new Date().toISOString(),
    };
    setGeneratedAssets(prev => [duplicate, ...prev]);
    showToast('Asset duplicated', 'success');
  };

  return (
    <div className="media-forge-page min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Generative Media Forge</h1>
              <p className="text-muted-foreground mt-1">
                AI-powered game asset creation for M11
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/project/${projectId}/assets`)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm"
              >
                Back to Asset Studio
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-4 border-b">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'generate'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wand2 className="h-4 w-4 inline mr-2" />
              Generate
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'presets'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📚 Presets
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'batch'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Batch Pack
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              History
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'generate' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Type Selection */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Media Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MEDIA_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setGenerationRequest(prev => ({ ...prev, type: type.value as any }))}
                      className={`p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors ${
                        generationRequest.type === type.value ? 'border-primary bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style & Quality */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Style & Quality</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Style Preset</label>
                    <select
                      value={generationRequest.style}
                      onChange={(e) => setGenerationRequest(prev => ({ ...prev, style: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {STYLE_PRESETS.map(preset => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label} - {preset.category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Quality</label>
                    <select
                      value={generationRequest.quality}
                      onChange={(e) => setGenerationRequest(prev => ({ ...prev, quality: e.target.value as any }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {QUALITY_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label} - {level.speed}, {level.cost}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Dimensions (for visual assets) */}
            {(generationRequest.type === 'character' || generationRequest.type === 'enemy' || 
              generationRequest.type === 'prop' || generationRequest.type === 'ui' || 
              generationRequest.type === 'background' || generationRequest.type === 'texture' || 
              generationRequest.type === 'sprite') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Width</label>
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
                  <label className="text-sm font-medium mb-2 block">Height</label>
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
            )}

            {/* Count */}
            <div>
              <label className="text-sm font-medium mb-2 block">Count</label>
              <input
                type="number"
                value={generationRequest.count || 1}
                onChange={(e) => setGenerationRequest(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                min={1}
                max={10}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Prompt */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Describe your {generationRequest.type}
              </label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={`Describe the ${generationRequest.type} you want to generate...`}
                rows={4}
                className="w-full px-3 py-2 border rounded-md resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!promptInput.trim() || isGenerating}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-medium"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  Generate {generationRequest.type}
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {MEDIA_TYPES.map(type => (
                <div 
                  key={type.value} 
                  className="p-6 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-center"
                >
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <h3 className="font-medium">{type.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Complete Asset Pack Generator</h3>
              <p className="text-muted-foreground mb-4">
                Generate a complete set of assets for your game concept. Perfect for prototyping!
              </p>
              <div className="space-y-4">
                <textarea
                  placeholder="Describe your game concept (e.g., 'A fantasy platformer with dragons and castles')"
                  value={packConcept}
                  onChange={(e) => setPackConcept(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md resize-none"
                />
                <button 
                  onClick={handleGeneratePack}
                  disabled={!packConcept.trim() || isGenerating}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-medium"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                      Generating Pack...
                    </>
                  ) : (
                    <>
                      <Package className="h-5 w-5" />
                      Generate Complete Asset Pack
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedPacks.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Generated Asset Packs</h3>
                {generatedPacks.map(pack => (
                  <div key={pack.id} className="border rounded-lg p-6 bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{pack.name}</h4>
                        <p className="text-muted-foreground">{pack.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pack.assets.length} assets • {new Date(pack.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 border rounded-md hover:bg-muted">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {pack.assets.slice(0, 12).map(asset => (
                        <div key={asset.id} className="text-center">
                          <img 
                            src={asset.url} 
                            alt={asset.name}
                            className="w-16 h-16 object-cover rounded-lg mx-auto mb-2"
                          />
                          <div className="text-xs truncate">{asset.type}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-6xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Generated Assets</h3>
              {generatedAssets.map(asset => (
                <div key={asset.id} className="p-6 border rounded-lg bg-card">
                  <div className="flex items-center gap-6">
                    <img 
                      src={asset.url} 
                      alt={asset.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{asset.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="bg-secondary px-2 py-1 rounded text-sm">{asset.type}</span>
                        {asset.width && asset.height && (
                          <span className="text-sm text-muted-foreground">{asset.width}x{asset.height}</span>
                        )}
                        {asset.duration && (
                          <span className="text-sm text-muted-foreground">{asset.duration}s</span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(asset.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          asset.metadata.quality === 'ultra' ? 'bg-purple-100 text-purple-800' :
                          asset.metadata.quality === 'high' ? 'bg-blue-100 text-blue-800' :
                          asset.metadata.quality === 'standard' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.metadata.quality}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {asset.metadata.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(asset)}
                        className="p-2 border rounded-md hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDuplicateAsset(asset)}
                        className="p-2 border rounded-md hover:bg-muted"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-2 border rounded-md hover:bg-muted text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {generatedAssets.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No generated assets yet</h3>
                  <p className="text-muted-foreground">
                    Start by generating your first asset using the Generate tab
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};