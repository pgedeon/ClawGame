/**
 * @clawgame/web - AI Asset Suggestions
 * Suggests relevant assets based on project context and scene analysis.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, type SceneAnalysis } from '../api/client';
import { Sparkles, AlertCircle, RefreshCw, X } from 'lucide-react';
import { logger } from '../utils/logger';

interface AssetSuggestionsProps {
  projectId?: string;
}

export const AssetSuggestions: React.FC<AssetSuggestionsProps> = ({ projectId: propProjectId }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || routeProjectId;

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<{
    assets: string[];
    genre: string;
    confidence: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [projectId]);

  const loadSuggestions = async () => {
    if (!projectId) {
      setError('Project ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get scene analysis for context
      let analysis: SceneAnalysis | null = null;
      try {
        analysis = await api.getSceneAnalysis(projectId);
      } catch (err) {
        logger.warn('Scene analysis not available, using generic suggestions:', err);
      }

      // Generate suggestions based on scene data
      const suggestions = generateAssetSuggestions(analysis);
      setSuggestions(suggestions);
    } catch (err: any) {
      logger.error('Failed to load asset suggestions:', err);
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const generateAssetSuggestions = (analysis: SceneAnalysis | null) => {
    const baseSuggestions = [
      'pixel art sprite sheet (32x32)',
      'game background (parallax layers)',
      'UI icons (health, coins, keys)',
      'sound effects (jump, collect, damage)',
      'particle textures (sparks, explosions)'
    ];

    const genre = analysis?.dominantGenre || 'generic';
    const assets: string[] = [];

    switch (genre) {
      case 'platformer':
        assets.push(
          'platform tiles (grass, stone, ice)',
          'player sprite with idle/run/jump animations',
          'enemy sprites (patrol, chase)',
          'collectible items (coins, stars, powerups)',
          'background layers (foreground, midground, sky)'
        );
        break;

      case 'top-down':
        assets.push(
          'player character with facing directions',
          'enemy AI sprites (zombies, robots, monsters)',
          'prop sprites (crates, barrels, obstacles)',
          'weapon sprites (guns, melee)',
          'top-down environment tiles'
        );
        break;

      case 'rpg':
        assets.push(
          'character spritesheets (idle, walk, attack)',
          'NPC sprites (villagers, merchants)',
          'UI elements (dialogue boxes, inventory slots)',
          'item icons (potions, weapons, armor)',
          'terrain tiles (grass, water, mountains)'
        );
        break;

      case 'shooter':
        assets.push(
          'ship/sprite with engine effects',
          'projectile sprites (bullets, lasers, missiles)',
          'explosion particle textures',
          'enemy ships (fighters, bosses)',
          'starfield background'
        );
        break;

      default:
        assets.push(...baseSuggestions);
    }

    // Add feature-specific suggestions
    if (analysis?.hasEnemies || analysis?.entityTypes?.includes('enemy')) {
      assets.push('enemy sprite sheets (idle, patrol, attack)', 'combat animations');
    }
    if (analysis?.hasCollectibles || analysis?.entityTypes?.includes('collectible')) {
      assets.push('collectible sprites (coins, gems, keys)');
    }
    if (analysis?.hasPlayer) {
      assets.push('player sprite with animations');
    }
    if (analysis?.hasPlatforms) {
      assets.push('platform tiles (multiple textures)');
    }
    if (analysis?.hasSprites) {
      assets.push('sprite sheet with idle/run animations');
    }
    if (analysis?.hasBackground) {
      assets.push('parallax background layers');
    }

    return {
      assets: assets.slice(0, 8),
      genre,
      confidence: analysis?.dominantGenre ? 0.85 : 0.5
    };
  };

  if (dismissed || !projectId) {
    return null;
  }

  return (
    <div className="asset-suggestions-container">
      <button
        className="suggestions-dismiss"
        onClick={() => setDismissed(true)}
        title="Dismiss suggestions"
      >
        <X size={14} />
      </button>

      <div className="suggestions-header">
        <Sparkles size={16} className="suggestions-icon" />
        <h3>AI Asset Suggestions</h3>
        {suggestions && (
          <span className="suggestions-badge">
            {suggestions.genre} game
          </span>
        )}
      </div>

      {loading && (
        <div className="suggestions-loading">
          <RefreshCw size={18} className="spinning" />
          <span>Analyzing project...</span>
        </div>
      )}

      {error && (
        <div className="suggestions-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadSuggestions} className="suggestions-retry">
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {suggestions && !loading && !error && (
        <div className="suggestions-content">
          <p className="suggestions-subtitle">
            Based on your scene analysis ({Math.round(suggestions.confidence * 100)}% confidence)
          </p>
          <ul className="suggestions-list">
            {suggestions.assets.map((asset, index) => (
              <li key={index} className="suggestion-item">
                <span className="suggestion-text">{asset}</span>
              </li>
            ))}
          </ul>
          <button className="suggestions-refresh" onClick={loadSuggestions}>
            <RefreshCw size={14} />
            Refresh Suggestions
          </button>
        </div>
      )}
    </div>
  );
};
