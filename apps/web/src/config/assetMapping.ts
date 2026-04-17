/**
 * Asset Mapping Configuration for Projects
 * Provides project-specific sprite asset mappings that override default entity-to-sprite relationships
 */

import { spriteManager } from '../utils/spriteLoader';

// Default asset mapping structure
interface AssetMapping {
  entityTypes: Record<string, string[]>; // entity type -> array of asset IDs
  defaultAssets: Record<string, string>; // entity type -> default asset ID
  fallbackStrategy: 'first-match' | 'highest-priority' | 'explicit';
}

// Project-specific asset mapping configuration
interface ProjectAssetMapping {
  projectId: string;
  mappings: Record<string, AssetMapping>; // genre -> asset mapping
  customSprites: Record<string, string>; // custom sprite URLs
}

// Global project mappings registry
const projectMappings = new Map<string, ProjectAssetMapping>();

// Default asset mapping for each genre
const DEFAULT_GENRE_MAPPINGS: Record<string, AssetMapping> = {
  'platformer': {
    entityTypes: {
      player: ['player-character', 'main-hero', 'player-sprite'],
      enemy: ['enemy-sprite', 'monster-sprite', 'bad-guy'],
      collectible: ['coin', 'gem', 'powerup', 'item'],
      obstacle: ['platform', 'wall', 'block', 'barrier'],
      trigger: ['goal', 'flag', 'checkpoint']
    },
    defaultAssets: {
      player: 'player-character',
      enemy: 'enemy-sprite',
      collectible: 'coin',
      obstacle: 'platform',
      trigger: 'goal'
    },
    fallbackStrategy: 'first-match'
  },
  'rpg': {
    entityTypes: {
      player: ['player-portrait', 'hero-avatar', 'character-sprite'],
      enemy: ['monster', 'beast', 'foe'],
      collectible: ['loot', 'treasure', 'item'],
      npc: ['villager', 'merchant', 'companion'],
      obstacle: ['rock', 'tree', 'furniture'],
      trigger: ['door', 'portal', 'chest']
    },
    defaultAssets: {
      player: 'player-portrait',
      enemy: 'monster',
      collectible: 'loot',
      npc: 'villager',
      obstacle: 'rock',
      trigger: 'door'
    },
    fallbackStrategy: 'explicit'
  },
  'tower-defense': {
    entityTypes: {
      'td-enemy': ['goblin', 'orc', 'skeleton'],
      tower: ['basic-tower', 'cannon-tower', 'magic-tower'],
      projectile: ['arrow', 'fireball', 'bolt'],
      collectible: ['coin', 'gem', 'mana-crystal'],
      obstacle: ['wall', 'barrier', 'blockade'],
      core: ['base', 'heart', 'core']
    },
    defaultAssets: {
      'td-enemy': 'goblin',
      tower: 'basic-tower',
      projectile: 'arrow',
      collectible: 'coin',
      obstacle: 'wall',
      core: 'base'
    },
    fallbackStrategy: 'highest-priority'
  },
  'puzzle': {
    entityTypes: {
      player: ['puzzle-piece', 'player-token', 'cursor'],
      collectible: ['key', 'gem', 'star'],
      obstacle: ['barrier', 'block', 'switch'],
      trigger: ['goal', 'solution', 'target']
    },
    defaultAssets: {
      player: 'puzzle-piece',
      collectible: 'key',
      obstacle: 'barrier',
      trigger: 'goal'
    },
    fallbackStrategy: 'first-match'
  }
};

class AssetMappingManager {
  /**
   * Set asset mapping for a specific project
   */
  setProjectMapping(projectId: string, mapping: ProjectAssetMapping): void {
    projectMappings.set(projectId, mapping);
    console.log(`Asset mapping configured for project: ${projectId}`);
  }

  /**
   * Get asset mapping for a specific project
   */
  getProjectMapping(projectId: string): ProjectAssetMapping | null {
    return projectMappings.get(projectId) || null;
  }

  /**
   * Configure default mapping for a project based on genre
   */
  configureProjectForGenre(projectId: string, genre: string): void {
    const mapping = DEFAULT_GENRE_MAPPINGS[genre];
    if (!mapping) {
      console.warn(`No default mapping found for genre: ${genre}`);
      return;
    }

    const projectMapping: ProjectAssetMapping = {
      projectId,
      mappings: {
        [genre]: mapping
      },
      customSprites: {}
    };

    this.setProjectMapping(projectId, projectMapping);
    console.log(`Default asset mapping configured for project ${projectId} with genre ${genre}`);
  }

  /**
   * Get the appropriate asset ID for an entity type in a project
   */
  getAssetForEntity(projectId: string, entityType: string): string | null {
    const mapping = this.getProjectMapping(projectId);
    if (!mapping) {
      // Fallback to default sprite manager behavior
      return null;
    }

    // Find the genre mapping (using first available genre)
    const genre = Object.keys(mapping.mappings)[0];
    const genreMapping = mapping.mappings[genre];

    // Check if entity type is explicitly defined
    if (genreMapping.entityTypes[entityType]) {
      const assets = genreMapping.entityTypes[entityType];
      const defaultAsset = genreMapping.defaultAssets[entityType];
      
      if (defaultAsset && assets.includes(defaultAsset)) {
        return defaultAsset;
      }

      // Apply fallback strategy
      switch (genreMapping.fallbackStrategy) {
        case 'first-match':
          return assets[0] || null;
        case 'highest-priority':
          // For now, just return the first match - could be enhanced with priority system
          return assets[0] || null;
        case 'explicit':
          return defaultAsset || null;
        default:
          return assets[0] || null;
      }
    }

    return null;
  }

  /**
   * Get asset URL for a specific project and asset
   */
  getAssetUrl(projectId: string, assetId: string): string {
    // First check if this is a custom sprite URL
    const mapping = this.getProjectMapping(projectId);
    if (mapping && mapping.customSprites[assetId]) {
      return mapping.customSprites[assetId];
    }

    // Otherwise use the standard sprite manager URL
    return spriteManager.getAssetUrl(projectId, assetId);
  }

  /**
   * Add a custom sprite URL to a project
   */
  addCustomSprite(projectId: string, assetId: string, url: string): void {
    const mapping = this.getProjectMapping(projectId);
    if (!mapping) {
      console.warn(`No mapping found for project: ${projectId}`);
      return;
    }

    mapping.customSprites[assetId] = url;
    console.log(`Custom sprite added to project ${projectId}: ${assetId} -> ${url}`);
  }

  /**
   * Remove a custom sprite from a project
   */
  removeCustomSprite(projectId: string, assetId: string): void {
    const mapping = this.getProjectMapping(projectId);
    if (!mapping) {
      console.warn(`No mapping found for project: ${projectId}`);
      return;
    }

    delete mapping.customSprites[assetId];
    console.log(`Custom sprite removed from project ${projectId}: ${assetId}`);
  }

  /**
   * Get all available entity types for a project
   */
  getAvailableEntityTypes(projectId: string): string[] {
    const mapping = this.getProjectMapping(projectId);
    if (!mapping) {
      return [];
    }

    const entityTypes = new Set<string>();
    Object.values(mapping.mappings).forEach(genreMapping => {
      Object.keys(genreMapping.entityTypes).forEach(type => {
        entityTypes.add(type);
      });
    });

    return Array.from(entityTypes);
  }

  /**
   * Export project mapping configuration
   */
  exportProjectMapping(projectId: string): string {
    const mapping = this.getProjectMapping(projectId);
    if (!mapping) {
      return '{}';
    }

    return JSON.stringify(mapping, null, 2);
  }

  /**
   * Import project mapping configuration
   */
  importProjectMapping(projectId: string, config: string): void {
    try {
      const mapping = JSON.parse(config) as ProjectAssetMapping;
      this.setProjectMapping(projectId, mapping);
      console.log(`Asset mapping imported for project: ${projectId}`);
    } catch (error) {
      console.error('Failed to import asset mapping:', error);
      throw new Error('Invalid asset mapping configuration');
    }
  }

  /**
   * Clear all project mappings
   */
  clearAllMappings(): void {
    projectMappings.clear();
    console.log('All project asset mappings cleared');
  }

  /**
   * Get statistics about configured projects
   */
  getStats(): { totalProjects: number; genres: string[] } {
    const genres = new Set<string>();
    projectMappings.forEach(mapping => {
      Object.keys(mapping.mappings).forEach(genre => {
        genres.add(genre);
      });
    });

    return {
      totalProjects: projectMappings.size,
      genres: Array.from(genres)
    };
  }
}

// Export singleton instance
export const assetMappingManager = new AssetMappingManager();

// Convenience function for setting up projects quickly
export function configureProjectAssets(projectId: string, genre: string): void {
  assetMappingManager.configureProjectForGenre(projectId, genre);
}

// Convenience function for getting sprite for entity in project context
export function getProjectSprite(projectId: string, entityType: string): HTMLImageElement {
  const assetId = assetMappingManager.getAssetForEntity(projectId, entityType);
  
  if (assetId) {
    // Use the asset mapping URL if we have one
    return spriteManager.getFallbackSprite(assetId);
  }
  
  // Fallback to default sprite manager
  return spriteManager.getFallbackSprite(entityType);
}