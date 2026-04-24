/**
 * @clawgame/api - Asset Factory Core Tests
 * M10: Sprite analysis, slicing, pixel pipeline, tileset forge, batch utilities
 */

import { mkdirSync, existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import { analyzeSprite, sliceSpriteSheet, pixelize, reducePalette } from '../services/imageProcessingService';
import { createProject, cleanupProject } from './utils';

describe('Asset Factory Core - M10', () => {
  const TEST_PROJECT = 'test-asset-factory';
  const TEST_DIR = join(process.env.PROJECTS_DIR || './data/projects', TEST_PROJECT);
  const PROCESSED_DIR = join(TEST_DIR, 'processed');

  beforeAll(async () => {
    // Create test project
    await createProject(TEST_PROJECT);
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(PROCESSED_DIR, { recursive: true });
    
    // Create a proper test image using Sharp
    const redSquare = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 255 }
      }
    }).png().toFile(join(TEST_DIR, 'test-sprite.png'));
    
    // Create a mock sprite sheet (64x64 with 4 32x32 frames)
    const spriteSheet = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      // Frame 1: Red square (top-left)
      { input: await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } }
      }).png().toBuffer(), gravity: 'northwest', left: 0, top: 0 },
      // Frame 2: Green square (top-right)
      { input: await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 255 } }
      }).png().toBuffer(), gravity: 'northeast', left: 32, top: 0 },
      // Frame 3: Blue square (bottom-left)
      { input: await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 255 } }
      }).png().toBuffer(), gravity: 'southwest', left: 0, top: 32 },
      // Frame 4: White square (bottom-right)
      { input: await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
      }).png().toBuffer(), gravity: 'southeast', left: 32, top: 32 }
    ])
    .png()
    .toFile(join(TEST_DIR, 'test-sheet.png'));
  });

  afterAll(async () => {
    await cleanupProject(TEST_PROJECT);
  });

  describe('Sprite Analyzer', () => {
    it('should analyze sprite metadata', async () => {
      const imagePath = join(TEST_DIR, 'test-sprite.png');
      const analysis = await analyzeSprite(imagePath);

      expect(analysis).toMatchObject({
        width: 32,
        height: 32,
        channels: 4,
        hasAlpha: true,
      });

      expect(analysis.dominantColors).toBeDefined();
      expect(Array.isArray(analysis.dominantColors)).toBe(true);
      expect(analysis.dominantColors.length).toBeGreaterThan(0);
    });

    it('should detect sprite grid patterns', async () => {
      const imagePath = join(TEST_DIR, 'test-sprite.png');
      const analysis = await analyzeSprite(imagePath);

      // 32x32 sprite could be detected as 1x1 grid (single frame)
      expect(analysis.detectedGrid).toBeDefined();
      expect(typeof analysis.detectedGrid).toBe('object');
      expect(analysis.detectedGrid).toHaveProperty('cols');
      expect(analysis.detectedGrid).toHaveProperty('rows');
      expect(analysis.detectedGrid).toHaveProperty('frameWidth');
      expect(analysis.detectedGrid).toHaveProperty('frameHeight');
    });
  });

  describe('Sprite Sheet Slicer', () => {
    it('should slice a sprite sheet into individual frames', async () => {
      const imagePath = join(TEST_DIR, 'test-sheet.png');
      const result = await sliceSpriteSheet(
        imagePath,
        PROCESSED_DIR,
        { frameWidth: 32, frameHeight: 32, name: 'test-frames' }
      );

      expect(result.frames).toHaveLength(4);
      expect(result.manifest).toMatchObject({
        name: 'test-frames',
        frameWidth: 32,
        frameHeight: 32,
        columns: 2,
        rows: 2,
        frameCount: 4,
      });

      // Check that all frame files were created
      result.frames.forEach(frame => {
        expect(existsSync(frame.path)).toBe(true);
      });
    });
  });

  describe('Pixel Pipeline', () => {
    it('should pixelize an image', async () => {
      const imagePath = join(TEST_DIR, 'test-sprite.png');
      const outputPath = join(PROCESSED_DIR, 'pixelized-sprite.png');
      const result = await pixelize(
        imagePath,
        outputPath,
        { pixelSize: 8, edgeCleanup: true }
      );

      expect(existsSync(outputPath)).toBe(true);
      expect(result).toMatchObject({
        path: outputPath,
        width: 32,
        height: 32,
      });
    });

    it('should reduce palette of an image', async () => {
      const imagePath = join(TEST_DIR, 'test-sprite.png');
      const outputPath = join(PROCESSED_DIR, 'palette-sprite.png');
      const result = await reducePalette(
        imagePath,
        outputPath,
        4
      );

      expect(existsSync(outputPath)).toBe(true);
      expect(result).toMatchObject({
        path: outputPath,
      });
      expect(Array.isArray(result.palette)).toBe(true);
      expect(result.palette.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files gracefully', async () => {
      const nonexistentPath = join(TEST_DIR, 'nonexistent.png');
      
      await expect(analyzeSprite(nonexistentPath)).rejects.toThrow();
    });

    it('should handle invalid slicing parameters', async () => {
      const imagePath = join(TEST_DIR, 'test-sprite.png');
      
      await expect(
        sliceSpriteSheet(imagePath, PROCESSED_DIR, { frameWidth: 0, frameHeight: 32, name: 'invalid' })
      ).rejects.toThrow();
    });
  });
});