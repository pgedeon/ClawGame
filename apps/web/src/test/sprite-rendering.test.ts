/**
 * Sprite Rendering Tests
 * Tests that the sprite loading and rendering system works properly in the game preview
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { spriteManager } from '../utils/spriteLoader';

describe('SpriteManager', () => {
  beforeEach(() => {
    // Clear cache before each test
    spriteManager.clearCache();
  });

  describe('Fallback Sprites', () => {
    it('should return fallback image for unknown entity type', () => {
      const sprite = spriteManager.getFallbackSprite('unknown_entity');
      expect(sprite).toBeDefined();
      expect(typeof sprite).toBe('object');
    });

    it('should return specific fallback sprites for known entity types', () => {
      const playerSprite = spriteManager.getFallbackSprite('player');
      const enemySprite = spriteManager.getFallbackSprite('enemy');
      const collectibleSprite = spriteManager.getFallbackSprite('collectible');

      expect(playerSprite).toBeDefined();
      expect(enemySprite).toBeDefined();
      expect(collectibleSprite).toBeDefined();

      // Different types should have different fallback sprites
      expect(playerSprite).not.toBe(enemySprite);
      expect(enemySprite).not.toBe(collectibleSprite);
    });

    it('should map entity types to appropriate fallback sprites', () => {
      const testCases = [
        { type: 'player' },
        { type: 'enemy' },
        { type: 'collectible' },
        { type: 'health' },
        { type: 'rune' },
        { type: 'npc' },
        { type: 'unknown' },
      ];

      testCases.forEach(({ type }) => {
        const sprite = spriteManager.getFallbackSprite(type);
        expect(sprite).toBeDefined();
      });
    });
  });

  describe('Asset URL Generation', () => {
    it('should generate correct asset URLs', () => {
      const projectId = 'test-project';
      const assetId = 'test-asset';
      
      const url = spriteManager.getAssetUrl(projectId, assetId);
      
      expect(url). toMatch(/\/api\/projects\/test-project\/assets\/test-asset\/file$/);
    });

    it('should handle different project IDs and asset IDs', () => {
      const testCases = [
        { projectId: 'project1', assetId: 'asset1' },
        { projectId: 'my-game', assetId: 'spritesheet' },
        { projectId: 'test-project-123', assetId: 'character-sprite' },
      ];

      testCases.forEach(({ projectId, assetId }) => {
        const url = spriteManager.getAssetUrl(projectId, assetId);
        expect(url).toContain(`/api/projects/${projectId}/assets/${assetId}/file`);
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear cache properly', () => {
      // Test that clearCache doesn't throw errors
      expect(() => spriteManager.clearCache()).not.toThrow();
    });
  });

  describe('SpriteManager API', () => {
    it('should have required methods', () => {
      expect(spriteManager.getFallbackSprite).toBeDefined();
      expect(spriteManager.getAssetUrl).toBeDefined();
      expect(spriteManager.clearCache).toBeDefined();
      expect(spriteManager.loadSpriteAsset).toBeDefined();
    });

    it('should handle null/undefined parameters gracefully', () => {
      // Test that the methods handle edge cases without throwing errors
      expect(() => spriteManager.getFallbackSprite(null as any)).not.toThrow();
      expect(() => spriteManager.getFallbackSprite(undefined as any)).not.toThrow();
      expect(() => spriteManager.getAssetUrl('', '')).not.toThrow();
      expect(() => spriteManager.clearCache()).not.toThrow();
    });
  });

  describe('Sprite Integration', () => {
    it('should provide fallback sprites that can be used in rendering', () => {
      // Test that fallback sprites are available and can be used in rendering contexts
      const fallbackSprite = spriteManager.getFallbackSprite('player');
      expect(fallbackSprite).toBeDefined();
      
      // In a real browser environment, this sprite would be usable with canvas context
      // For testing, we just verify it exists and is the right type
      expect(typeof fallbackSprite).toBe('object');
    });
  });
});

describe('Sprite System Integration', () => {
  beforeEach(() => {
    // Clear cache before each test
    spriteManager.clearCache();
  });

  it('should maintain cache consistency across operations', () => {
    // Clear cache
    spriteManager.clearCache();
    
    // Add something to cache by accessing fallback sprites
    spriteManager.getFallbackSprite('player');
    spriteManager.getFallbackSprite('enemy');
    
    // Clear again should not throw
    expect(() => spriteManager.clearCache()).not.toThrow();
  });

  it('should handle multiple sprite requests consistently', () => {
    const playerSprite1 = spriteManager.getFallbackSprite('player');
    const playerSprite2 = spriteManager.getFallbackSprite('player');
    
    // Same type should return same sprite instance
    expect(playerSprite1).toBe(playerSprite2);
    
    // Different types should return different sprites
    const enemySprite = spriteManager.getFallbackSprite('enemy');
    expect(playerSprite1).not.toBe(enemySprite);
  });
});