/**
 * Asset Mapping Configuration Tests
 * Tests that the project-specific asset mapping system works correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { assetMappingManager, configureProjectAssets, getProjectSprite } from '../config/assetMapping';

describe('Asset Mapping Configuration', () => {
  beforeEach(() => {
    // Clear all mappings before each test
    assetMappingManager.clearAllMappings();
  });

  describe('Project Configuration', () => {
    it('should configure project with genre-based defaults', () => {
      const projectId = 'test-platformer';
      configureProjectAssets(projectId, 'platformer');
      
      const mapping = assetMappingManager.getProjectMapping(projectId);
      expect(mapping).toBeDefined();
      expect(mapping?.projectId).toBe(projectId);
      expect(mapping?.mappings['platformer']).toBeDefined();
    });

    it('should handle unknown genres gracefully', () => {
      const projectId = 'test-unknown';
      
      // Should not throw
      expect(() => {
        configureProjectAssets(projectId, 'unknown-genre');
      }).not.toThrow();
    });

    it('should retrieve project mapping correctly', () => {
      const projectId = 'test-rpg';
      configureProjectAssets(projectId, 'rpg');
      
      const mapping = assetMappingManager.getProjectMapping(projectId);
      expect(mapping).toBeDefined();
      expect(mapping?.projectId).toBe('test-rpg');
    });
  });

  describe('Asset Resolution', () => {
    it('should resolve entity types to assets for platformer genre', () => {
      const projectId = 'test-platformer';
      configureProjectAssets(projectId, 'platformer');
      
      const playerAsset = assetMappingManager.getAssetForEntity(projectId, 'player');
      expect(playerAsset).toBe('player-character');
      
      const enemyAsset = assetMappingManager.getAssetForEntity(projectId, 'enemy');
      expect(enemyAsset).toBe('enemy-sprite');
      
      const collectibleAsset = assetMappingManager.getAssetForEntity(projectId, 'collectible');
      expect(collectibleAsset).toBe('coin');
    });

    it('should resolve entity types to assets for RPG genre', () => {
      const projectId = 'test-rpg';
      configureProjectAssets(projectId, 'rpg');
      
      const playerAsset = assetMappingManager.getAssetForEntity(projectId, 'player');
      expect(playerAsset).toBe('player-portrait');
      
      const npcAsset = assetMappingManager.getAssetForEntity(projectId, 'npc');
      expect(npcAsset).toBe('villager');
      
      const obstacleAsset = assetMappingManager.getAssetForEntity(projectId, 'obstacle');
      expect(obstacleAsset).toBe('rock');
    });

    it('should resolve entity types to assets for tower defense genre', () => {
      const projectId = 'test-td';
      configureProjectAssets(projectId, 'tower-defense');
      
      const enemyAsset = assetMappingManager.getAssetForEntity(projectId, 'td-enemy');
      expect(enemyAsset).toBe('goblin');
      
      const towerAsset = assetMappingManager.getAssetForEntity(projectId, 'tower');
      expect(towerAsset).toBe('basic-tower');
      
      const coreAsset = assetMappingManager.getAssetForEntity(projectId, 'core');
      expect(coreAsset).toBe('base');
    });

    it('should return null for unknown entity types', () => {
      const projectId = 'test-platformer';
      configureProjectAssets(projectId, 'platformer');
      
      const unknownAsset = assetMappingManager.getAssetForEntity(projectId, 'unknown-entity');
      expect(unknownAsset).toBe(null);
    });

    it('should return null for projects without mapping', () => {
      const unknownAsset = assetMappingManager.getAssetForEntity('unknown-project', 'player');
      expect(unknownAsset).toBe(null);
    });
  });

  describe('Custom Sprites', () => {
    it('should add custom sprite URLs to projects', () => {
      const projectId = 'test-custom';
      configureProjectAssets(projectId, 'platformer');
      
      const customUrl = '/api/projects/test-custom/assets/custom-player/file';
      assetMappingManager.addCustomSprite(projectId, 'custom-player', customUrl);
      
      const url = assetMappingManager.getAssetUrl(projectId, 'custom-player');
      expect(url).toBe(customUrl);
    });

    it('should remove custom sprites from projects', () => {
      const projectId = 'test-custom-remove';
      configureProjectAssets(projectId, 'platformer');
      
      const customUrl = '/api/projects/test-custom-remove/assets/character/file';
      assetMappingManager.addCustomSprite(projectId, 'character', customUrl);
      
      // Verify it was added
      let url = assetMappingManager.getAssetUrl(projectId, 'character');
      expect(url).toBe(customUrl);
      
      // Remove it
      assetMappingManager.removeCustomSprite(projectId, 'character');
      
      // Verify it was removed (should fallback to standard URL)
      url = assetMappingManager.getAssetUrl(projectId, 'character');
      expect(url).toBe(`/api/projects/test-custom-remove/assets/character/file`);
    });

    it('should handle custom sprite overrides', () => {
      const projectId = 'test-override';
      configureProjectAssets(projectId, 'platformer');
      
      // Add custom sprite for player
      const customUrl = '/api/projects/test-override/assets/custom-sprite/file';
      assetMappingManager.addCustomSprite(projectId, 'player', customUrl);
      
      // Get player sprite (should use custom URL)
      const url = assetMappingManager.getAssetUrl(projectId, 'player');
      expect(url).toBe(customUrl);
    });
  });

  describe('Available Entity Types', () => {
    it('should return entity types for configured project', () => {
      const projectId = 'test-types';
      configureProjectAssets(projectId, 'platformer');
      
      const types = assetMappingManager.getAvailableEntityTypes(projectId);
      expect(types).toContain('player');
      expect(types).toContain('enemy');
      expect(types).toContain('collectible');
      expect(types).toContain('obstacle');
      expect(types).toContain('trigger');
    });

    it('should return empty array for unconfigured project', () => {
      const types = assetMappingManager.getAvailableEntityTypes('unknown-project');
      expect(types).toEqual([]);
    });
  });

  describe('Import/Export', () => {
    it('should export project mapping configuration', () => {
      const projectId = 'test-export';
      configureProjectAssets(projectId, 'platformer');
      
      const exported = assetMappingManager.exportProjectMapping(projectId);
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
      
      // Should contain project ID
      expect(exported).toContain('test-export');
    });

    it('should import project mapping configuration', () => {
      const projectId = 'test-import';
      
      // Create sample config
      const config = JSON.stringify({
        projectId: 'test-import',
        mappings: {
          'platformer': {
            entityTypes: { player: ['hero'] },
            defaultAssets: { player: 'hero' },
            fallbackStrategy: 'first-match' as const
          }
        },
        customSprites: {}
      });
      
      // Import should not throw
      expect(() => {
        assetMappingManager.importProjectMapping(projectId, config);
      }).not.toThrow();
      
      // Verify it was imported
      const mapping = assetMappingManager.getProjectMapping(projectId);
      expect(mapping).toBeDefined();
      expect(mapping?.projectId).toBe('test-import');
    });

    it('should handle invalid import configuration gracefully', () => {
      expect(() => {
        assetMappingManager.importProjectMapping('test-invalid', 'invalid-json');
      }).toThrow();
    });
  });

  describe('Statistics', () => {
    it('should track configured projects and genres', () => {
      const stats = assetMappingManager.getStats();
      expect(stats.totalProjects).toBe(0);
      expect(stats.genres).toEqual([]);
      
      // Configure a project
      configureProjectAssets('test-genre', 'platformer');
      
      const stats2 = assetMappingManager.getStats();
      expect(stats2.totalProjects).toBe(1);
      expect(stats2.genres).toContain('platformer');
      
      // Configure another project with different genre
      configureProjectAssets('test-rpg', 'rpg');
      
      const stats3 = assetMappingManager.getStats();
      expect(stats3.totalProjects).toBe(2);
      expect(stats3.genres).toContain('platformer');
      expect(stats3.genres).toContain('rpg');
    });
  });

  describe('Project Sprite Function', () => {
    it('should get sprite for entity in project context', () => {
      const projectId = 'test-project-sprite';
      configureProjectAssets(projectId, 'platformer');
      
      // This function should return an HTMLImageElement or equivalent
      const sprite = getProjectSprite(projectId, 'player');
      expect(sprite).toBeDefined();
      expect(typeof sprite).toBe('object');
    });

    it('should fallback to sprite manager for unknown entities', () => {
      const projectId = 'test-fallback';
      configureProjectAssets(projectId, 'platformer');
      
      const sprite = getProjectSprite(projectId, 'unknown-entity');
      expect(sprite).toBeDefined();
    });
  });
});