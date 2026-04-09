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
      const enemies = service.listPresets('enemy');
      expect(enemies.length).toBeGreaterThan(0);
      expect(enemies.every(p => p.role === 'enemy')).toBe(true);
    });

    it('should filter by character role', () => {
      const chars = service.listPresets('character');
      expect(chars.length).toBeGreaterThan(0);
      expect(chars.every(p => p.role === 'character')).toBe(true);
    });

    it('should return empty for niche roles with no presets', () => {
      // All current roles have presets, but test the filter logic
      const backgrounds = service.listPresets('background');
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
    it('should return a preset by ID', () => {
      const preset = service.getPreset('character-hero');
      expect(preset).toBeDefined();
      expect(preset!.id).toBe('character-hero');
      expect(preset!.role).toBe('character');
      expect(preset!.artStyle).toBe('pixel');
    });

    it('should return undefined for unknown preset', () => {
      const preset = service.getPreset('nonexistent');
      expect(preset).toBeUndefined();
    });
  });

  describe('preset structure', () => {
    it('every preset has required fields', () => {
      const presets = service.listPresets();
      for (const p of presets) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.role).toBeTruthy();
        expect(p.artStyle).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.defaultWidth).toBeGreaterThan(0);
        expect(p.defaultHeight).toBeGreaterThan(0);
        expect(p.promptTemplate).toContain('{description}');
        expect(p.examples.length).toBeGreaterThan(0);
      }
    });

    it('every preset ID is unique', () => {
      const presets = service.listPresets();
      const ids = presets.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('generateFromPreset', () => {
    it('should throw for unknown preset', async () => {
      await expect(
        service.generateFromPreset({
          projectId: 'test',
          presetId: 'nonexistent',
          description: 'test',
        }),
      ).rejects.toThrow('Unknown preset');
    });

    it('should generate a single asset from a preset', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'character-hero',
        description: 'a brave knight',
      });

      expect(result.preset.id).toBe('character-hero');
      expect(result.assets.length).toBe(1);
      expect(result.assets[0].content).toContain('<svg');
      expect(result.assets[0].format).toBe('svg');
      expect(result.assets[0].width).toBe(64);
      expect(result.assets[0].height).toBe(64);
    });

    it('should generate multiple variants when count > 1', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'enemy-slime',
        description: 'green blob',
        count: 3,
      });

      expect(result.assets.length).toBe(3);
      for (const asset of result.assets) {
        expect(asset.content).toContain('<svg');
      }
    });

    it('should respect custom dimensions', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'enemy-slime',
        description: 'big slime',
        width: 128,
        height: 128,
      });

      expect(result.assets[0].width).toBe(128);
      expect(result.assets[0].height).toBe(128);
    });

    it('should respect art style override', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'character-hero',
        description: 'hero',
        artStyle: 'realistic',
      });

      // Should still generate valid SVG
      expect(result.assets[0].content).toContain('<svg');
    });

    it('should clamp count between 1 and 6', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'icon-item',
        description: 'sword',
        count: 10,
      });

      expect(result.assets.length).toBe(6);
    });

    it('should generate backgrounds at correct default size', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'bg-outdoor',
        description: 'grassy plains',
      });

      expect(result.assets[0].width).toBe(640);
      expect(result.assets[0].height).toBe(360);
    });

    it('should generate tilesets at correct default size', async () => {
      const result = await service.generateFromPreset({
        projectId: 'test-project',
        presetId: 'tileset-ground',
        description: 'stone floor',
      });

      expect(result.assets[0].width).toBe(256);
      expect(result.assets[0].height).toBe(256);
    });
  });
});
