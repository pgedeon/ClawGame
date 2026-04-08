/**
 * @clawgame/web - AssetSuggestions
 * AI-powered asset recommendations based on scene context and project data.
 * Provides contextual asset suggestions to help users build their games faster.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type AssetMetadata, type GenerationStatus } from '../../api/client';
import { Image, Sparkles, Target, Zap, ArrowRight } from 'lucide-react';

interface SceneAnalysis {
  entityTypes: string[];
  entityCount: number;
  hasPlayer: boolean;
  hasEnemies: boolean;
  hasPlatforms: boolean;
  hasCollectibles: boolean;
  hasSprites: boolean;
  dominantGenre?: string;
}

interface AssetSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  type: 'sprite' | 'tileset' | 'texture' | 'background';
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

export function AssetSuggestions() {
  const [projectId] = useParams<{ projectId: string }>();
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      analyzeScene();
      loadExistingAssets();
    }
  }, [projectId]);

  const analyzeScene = () => {
    // This is a simplified analysis - in a real implementation, 
    // you'd analyze the actual scene data from the scene editor
    const analysis: SceneAnalysis = {
      entityTypes: ['player', 'platform', 'collectible', 'enemy'],
      entityCount: 12,
      hasPlayer: true,
      hasEnemies: true,
      hasPlatforms: true,
      hasCollectibles: true,
      hasSprites: false,
      dominantGenre: 'platformer',
    };
    
    setSceneAnalysis(analysis);
    generateSuggestions(analysis);
  };

  const generateSuggestions = (analysis: SceneAnalysis) => {
    const newSuggestions: AssetSuggestion[] = [];

    // Based on entity types, suggest relevant assets
    if (analysis.hasPlayer && !analysis.hasSprites) {
      newSuggestions.push({
        id: 'player-sprite',
        title: 'Player Character',
        description: 'A heroic character for your platformer game',
        prompt: 'Pixel art side-view character with sword, standing pose, platformer game style',
        icon: <Image size={18} />,
        type: 'sprite',
        confidence: 0.9,
        priority: 'high',
      });
    }

    if (analysis.hasEnemies && analysis.hasPlatforms) {
      newSuggestions.push({
        id: 'enemy-sprite',
        title: 'Enemy Characters',
        description: 'Creatures to challenge the player',
        prompt: 'Pixel art enemy characters, platformer enemies, slime, bat, crab',
        icon: <Target size={18} />,
        type: 'sprite',
        confidence: 0.8,
        priority: 'medium',
      });
    }

    if (analysis.hasCollectibles) {
      newSuggestions.push({
        id: 'collectible',
        title: 'Collectible Items',
        description: 'Items for players to gather',
        prompt: 'Pixel art collectible coins, stars, gems, sparkly treasures',
        icon: <Sparkles size={18} />,
        type: 'sprite',
        confidence: 0.7,
        priority: 'medium',
      });
    }

    if (analysis.entityCount > 5 && !analysis.hasBackground) {
      newSuggestions.push({
        id: 'background',
        title: 'Game Background',
        description: 'Environment to bring your world to life',
        prompt: 'Pixel art game background, sky clouds, mountains, platformer level',
        icon: <Zap size={18} />,
        type: 'background',
        confidence: 0.6,
        priority: 'low',
      });
    }

    setSuggestions(newSuggestions);
  };

  const loadExistingAssets = async () => {
    try {
      if (projectId) {
        const assets = await api.listAssets(projectId);
        setGeneratedAssets(assets);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAsset = async (suggestion: AssetSuggestion) => {
    if (!projectId || generating) return;

    setGenerating(true);
    try {
      const generationRequest = {
        type: suggestion.type as any,
        prompt: suggestion.prompt,
        options: {
          style: 'pixel',
          format: 'png',
        },
      };

      const result = await api.generateAsset(projectId, generationRequest);
      
      // Poll for completion
      let completed = false;
      while (!completed) {
        const status = await api.getGenerationStatus(projectId, result.generationId);
        if (status.status === 'completed' || status.status === 'failed') {
          completed = true;
          if (status.status === 'completed') {
            // Reload assets to show the new one
            await loadExistingAssets();
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Failed to generate asset:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="asset-suggestions">
        <div className="suggestions-header">
          <h3>AI Asset Suggestions</h3>
          <div className="loading-spinner" />
        </div>
        <p>Analyzing your scene and generating recommendations...</p>
      </div>
    );
  }

  if (sceneAnalysis && suggestions.length > 0) {
    return (
      <div className="asset-suggestions">
        <div className="suggestions-header">
          <div className="ai-badge">
            <Sparkles size={14} />
            <span>AI Suggestions</span>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Based on your {sceneAnalysis.dominantGenre} scene with {sceneAnalysis.entityCount} entities
          </p>
        </div>

        <div className="suggestions-grid">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="suggestion-card"
              onClick={() => generateAsset(suggestion)}
            >
              <div className="suggestion-header">
                <div className="suggestion-icon">
                  {suggestion.icon}
                </div>
                <div className="suggestion-meta">
                  <h4>{suggestion.title}</h4>
                  <span className={`confidence-badge priority-${suggestion.priority}`}>
                    {suggestion.confidence * 100}% match
                  </span>
                </div>
              </div>
              
              <p className="suggestion-desc">{suggestion.description}</p>
              <div className="suggestion-prompt">
                <code>
                  {suggestion.prompt.substring(0, 60)}...
                </code>
              </div>
              
              <div className="suggestion-actions">
                <button
                  className={`btn btn-ai ${generating ? 'disabled' : ''}`}
                  disabled={generating}
                >
                  {generating ? 'Generating...' : 'Generate →'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="existing-assets">
          <h4>Existing Assets</h4>
          {generatedAssets.length > 0 ? (
            <div className="assets-count">
              You have {generatedAssets.length} assets. View them in your asset library.
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No assets yet. Start generating with AI suggestions!
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
SUGGESTIONS_CSS