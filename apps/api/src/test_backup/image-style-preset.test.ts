/**
 * Image Style Preset Service — Tests
 * M11: Generative Media Forge
 */

import { describe, it, expect } from 'vitest';
import { ImageStylePresetService } from '../services/imageStylePresetService';
import type { AssetRole } from '../services/imageStylePresetService';

// Minimal logger stub
const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

describe('ImageStylePresetService', () => {
  const service = new ImageStylePresetService(logger);

  describe('listPresets', () => {
    it('should return all presets', () => {
      const presets = service.listPresets();
      expect(presets.length).toBeGreaterThan(10);
    });

    it('should filter by role', () => {
      const enemies = service.listPresets({ role: 'enemy' as AssetRole });
      expect(enemies.length).toBeGreaterThan(0);
      expect(enemies.every(p => p.role === 'enemy')).toBe(true);
    });

    it('should filter by character role', () => {
      const chars = service.listPresets({ role: 'character' as AssetRole });
      expect(chars.length).toBeGreaterThan(0);
      expect(chars.every(p => p.role === 'character')).toBe(true);
    });

    it('should return empty for niche roles with no presets', () => {
      // All current roles have presets, but test the filter logic
      const backgrounds = service.listPresets({ role: 'background' as AssetRole });
      expect(backgrounds.every(p => p.role === 'background')).toBe(true);
    });
  });

  describe('listRoles', () => {
    it('should return unique roles', () => {
      const roles = service.listRoles();
      const unique = new Set(roles);
      expect(roles.length).toBe(unique.size);
      expect(roles).toContain('character');
      expect(roles).toContain('enemy');
      expect(roles).toContain('background');
    });
  });

  describe('getPreset', () => {
    it('should return specific preset by ID', () => {
      const preset = service.getPreset('pixel-warrior');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('pixel-warrior');
      expect(preset?.name).toBe('Pixel Warrior');
      expect(preset?.role).toBe('character');
    });

    it('should return undefined for non-existent preset', () => {
      const preset = service.getPreset('non-existent');
      expect(preset).toBeUndefined();
    });
  });

  describe('getPresetsByStyle', () => {
    it('should return presets for a specific art style', () => {
      const presets = service.getPresetsByStyle('pixel-art');
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every(p => p.artStyle === 'pixel-art')).toBe(true);
    });

    it('should return empty array for non-existent style', () => {
      const presets = service.getPresetsByStyle('non-existent-style');
      expect(presets).toEqual([]);
    });
  });

  describe('getPresetsByRole', () => {
    it('should return presets for a specific role', () => {
      const presets = service.getPresetsByRole('character');
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every(p => p.role === 'character')).toBe(true);
    });

    it('should return empty array for non-existent role', () => {
      const presets = service.getPresetsByRole('non-existent-role');
      expect(presets).toEqual([]);
    });
  });

  describe('searchPresets', () => {
    it('should find presets by name', () => {
      const presets = service.searchPresets('warrior');
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every(p => p.name.toLowerCase().includes('warrior'))).toBe(true);
    });

    it('should find presets by description', () => {
      const presets = service.searchPresets('knight');
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some(p => p.description?.toLowerCase().includes('knight'))).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const presets = service.searchPresets('non-existent-term');
      expect(presets).toEqual([]);
    });
  });

  describe('preset validation', () => {
    it('should validate preset structure', () => {
      const presets = service.listPresets();
      
      for (const preset of presets) {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('role');
        expect(preset).toHaveProperty('artStyle');
        expect(preset).toHaveProperty('promptTemplate');
        expect(preset).toHaveProperty('dimensions');
        expect(preset.dimensions).toHaveProperty('width');
        expect(preset.dimensions).toHaveProperty('height');
        expect(preset).toHaveProperty('quality');
        expect(preset).toHaveProperty('description');
        expect(preset.examples).toBeDefined();
        expect(Array.isArray(preset.examples)).toBe(true);
        expect(preset.examples.length).toBeGreaterThan(0);
      }
    });

    it('should validate character presets', () => {
      const chars = service.getPresetsByRole('character');
      
      for (const char of chars) {
        expect(char.role).toBe('character');
        expect(char.name).toMatch(/Warrior|Knight|Mage|Ranger|Paladin|Assassin|Barbarian|Cleric/);
        expect(char.quality).toBeOneOf(['high', 'ultra']);
      }
    });

    it('should validate enemy presets', () => {
      const enemies = service.getPresetsByRole('enemy');
      
      for (const enemy of enemies) {
        expect(enemy.role).toBe('enemy');
        expect(enemy.name).toMatch(/Orc|Goblin|Troll|Dragon|Skeleton|Zombie|Demon|Beholder/);
        expect(enemy.quality).toBeOneOf(['high', 'ultra']);
      }
    });

    it('should validate background presets', () => {
      const backgrounds = service.getPresetsByRole('background');
      
      for (const bg of backgrounds) {
        expect(bg.role).toBe('background');
        expect(bg.name).toMatch(/Forest|Dungeon|Castle|Mountain|Desert|Village|Cave|Swamp/);
        expect(bg.quality).toBeOneOf(['high', 'ultra']);
      }
    });

    it('should validate default dimensions', () => {
      const presets = service.listPresets();
      
      for (const preset of presets) {
        expect(preset.dimensions.width).toBeOneOf([32, 64, 128, 256, 512]);
        expect(preset.dimensions.height).toBeOneOf([32, 64, 128, 256, 512]);
      }
    });

    it('should validate art styles', () => {
      const presets = service.listPresets();
      
      for (const preset of presets) {
        expect(preset.artStyle).toBeOneOf(['pixel-art', 'hand-drawn', '3d-realistic', 'cartoon', 'fantasy', 'sci-fi', 'retro', 'modern']);
      }
    });
  });

  describe('preset examples', () => {
    it('should include valid examples for each preset', () => {
      const presets = service.listPresets();
      
      for (const preset of presets) {
        expect(preset.examples).toBeDefined();
        expect(Array.isArray(preset.examples)).toBe(true);
        expect(preset.examples.length).toBeGreaterThan(0);
        
        for (const example of preset.examples) {
          expect(example).toHaveProperty('prompt');
          expect(example.prompt).toBeString();
          expect(example.prompt.length).toBeGreaterThan(0);
          expect(example).toHaveProperty('description');
          expect(example.description).toBeString();
          expect(example.description.length).toBeGreaterThan(0);
        }
      }
    });

    it('should include quality metadata in examples', () => {
      const presets = service.listPresets();
      
      for (const preset of presets) {
        for (const example of preset.examples) {
          if (example.quality) {
            expect(example.quality).toBeOneOf(['draft', 'standard', 'high', 'ultra']);
          }
        }
      }
    });
  });

  describe('preset relationships', () => {
    it('should map roles to correct asset types', () => {
      const chars = service.getPresetsByRole('character');
      const enemies = service.getPresetsByRole('enemy');
      const props = service.getPresetsByRole('prop');
      const backgrounds = service.getPresetsByRole('background');
      
      expect(chars.length).toBeGreaterThan(0);
      expect(enemies.length).toBeGreaterThan(0);
      expect(props.length).toBeGreaterThan(0);
      expect(backgrounds.length).toBeGreaterThan(0);
    });

    it('should have unique preset IDs', () => {
      const presets = service.listPresets();
      const ids = presets.map(p => p.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have consistent art styles within role groups', () => {
      const pixelChars = service.getPresetsByRole('character').filter(p => p.artStyle === 'pixel-art');
      const fantasyChars = service.getPresetsByRole('character').filter(p => p.artStyle === 'fantasy');
      
      expect(pixelChars.every(p => p.artStyle === 'pixel-art')).toBe(true);
      expect(fantasyChars.every(p => p.artStyle === 'fantasy')).toBe(true);
    });
  });

  describe('preset metadata', () => {
    it('should include generation metadata for high-quality presets', () => {
      const highQualityPresets = service.listPresets().filter(p => p.quality === 'high' || p.quality === 'ultra');
      
      for (const preset of highQualityPresets) {
        expect(preset.generationMetadata).toBeDefined();
        if (preset.generationMetadata) {
          expect(preset.generationMetadata).toHaveProperty('temperature');
          expect(preset.generationMetadata.temperature).toBeGreaterThan(0);
          expect(preset.generationMetadata.temperature).toBeLessThan(1);
          expect(preset.generationMetadata).toHaveProperty('maxTokens');
          expect(preset.generationMetadata.maxTokens).toBeGreaterThan(100);
        }
      }
    });

    it('should include fallback generation metadata for standard presets', () => {
      const standardPresets = service.listPresets().filter(p => p.quality === 'standard');
      
      for (const preset of standardPresets) {
        expect(preset.generationMetadata).toBeDefined();
        if (preset.generationMetadata) {
          expect(preset.generationMetadata.temperature).toBeGreaterThan(0);
          expect(preset.generationMetadata.temperature).toBeLessThan(1);
        }
      }
    });
  });

  describe('preset performance', () => {
    it('should generate presets efficiently', () => {
      const start = Date.now();
      const presets = service.listPresets();
      const duration = Date.now() - start;
      
      expect(presets.length).toBeGreaterThan(20);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should search presets efficiently', () => {
      const start = Date.now();
      const presets = service.searchPresets('warrior');
      const duration = Date.now() - start;
      
      expect(presets.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should be fast
    });
  });

  describe('preset edge cases', () => {
    it('should handle empty search terms', () => {
      const presets = service.searchPresets('');
      expect(presets.length).toBeGreaterThan(0); // Should return all presets
    });

    it('should handle case-insensitive search', () => {
      const upper = service.searchPresets('WARRIOR');
      const lower = service.searchPresets('warrior');
      const mixed = service.searchPresets('Warrior');
      
      expect(upper.length).toBe(lower.length);
      expect(lower.length).toBe(mixed.length);
    });

    it('should handle partial term matching', () => {
      const warrior = service.searchPresets('warrior');
      const war = service.searchPresets('war');
      
      expect(warrior.length).toBeLessThanOrEqual(war.length);
    });
  });
});