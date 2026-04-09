/**
 * @clawgame/api - Image Processing Service Tests
 * M10: Asset Factory Core
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  analyzeSprite,
  sliceSpriteSheet,
  pixelize,
  reducePalette,
  assembleTileset,
  batchProcess,
} from '../services/imageProcessingService';

const TMP = join(__dirname, '__test_tmp__');
const SHEET_PATH = join(TMP, 'spritesheet.png');
const TILE1_PATH = join(TMP, 'tile1.png');
const TILE2_PATH = join(TMP, 'tile2.png');
const OUTPUT = join(TMP, 'output');

beforeAll(async () => {
  mkdirSync(TMP, { recursive: true });
  mkdirSync(OUTPUT, { recursive: true });

  // Create a 128x64 sprite sheet (4 cols × 2 rows of 32×32 frames)
  // Each frame has a unique color so we can verify slicing
  const composites: sharp.OverlayOptions[] = [];
  const colors = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
    [255, 0, 255], [0, 255, 255], [128, 128, 0], [128, 0, 128],
  ];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      const [r, g, b] = colors[idx];
      const buf = await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r, g, b, alpha: 255 } },
      }).png().toBuffer();
      composites.push({ input: buf, left: col * 32, top: row * 32 });
    }
  }

  await sharp({
    create: { width: 128, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toFile(SHEET_PATH);

  // Create two small tiles for tileset assembly
  for (const [i, path] of [[0, TILE1_PATH], [1, TILE2_PATH]] as const) {
    const [r, g, b] = colors[i];
    await sharp({
      create: { width: 16, height: 16, channels: 4, background: { r, g, b, alpha: 255 } },
    }).png().toFile(path);
  }
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe('analyzeSprite', () => {
  it('detects image dimensions', async () => {
    const result = await analyzeSprite(SHEET_PATH);
    expect(result.width).toBe(128);
    expect(result.height).toBe(64);
    expect(result.hasAlpha).toBe(true);
  });

  it('detects grid structure', async () => {
    const result = await analyzeSprite(SHEET_PATH);
    expect(result.detectedGrid).toBeDefined();
    expect(result.detectedGrid!.frameWidth).toBe(32);
    expect(result.detectedGrid!.frameHeight).toBe(32);
    expect(result.detectedGrid!.cols).toBe(4);
    expect(result.detectedGrid!.rows).toBe(2);
  });

  it('extracts dominant colors', async () => {
    const result = await analyzeSprite(SHEET_PATH);
    expect(result.dominantColors.length).toBeGreaterThan(0);
    // All should be hex strings
    result.dominantColors.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/));
  });
});

describe('sliceSpriteSheet', () => {
  it('slices into correct number of frames', async () => {
    const outDir = join(OUTPUT, 'sliced');
    const result = await sliceSpriteSheet(SHEET_PATH, outDir, {
      frameWidth: 32,
      frameHeight: 32,
      name: 'test',
    });

    expect(result.frames.length).toBe(8);
    expect(result.manifest.frameCount).toBe(8);
    expect(result.manifest.columns).toBe(4);
    expect(result.manifest.rows).toBe(2);
  });

  it('writes manifest JSON', async () => {
    const manifestPath = join(OUTPUT, 'sliced', 'test_manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('test');
    expect(manifest.frameWidth).toBe(32);
  });

  it('writes frame PNG files', async () => {
    const frame0 = join(OUTPUT, 'sliced', 'test_000.png');
    expect(existsSync(frame0)).toBe(true);
    const meta = await sharp(frame0).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
  });

  it('preserves frame colors correctly', async () => {
    // Frame 0 should be red (255, 0, 0)
    const frame0 = join(OUTPUT, 'sliced', 'test_000.png');
    const { data } = await sharp(frame0).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(255); // R
    expect(data[1]).toBe(0);   // G
    expect(data[2]).toBe(0);   // B
  });
});

describe('pixelize', () => {
  it('produces output with same dimensions', async () => {
    const outPath = join(OUTPUT, 'pixelized.png');
    const result = await pixelize(SHEET_PATH, outPath, { pixelSize: 4, edgeCleanup: false });
    expect(result.width).toBe(128);
    expect(result.height).toBe(64);
    expect(existsSync(outPath)).toBe(true);
  });

  it('produces pixelated output (quantized colors)', async () => {
    const outPath = join(OUTPUT, 'pixelized2.png');
    await pixelize(SHEET_PATH, outPath, { pixelSize: 8, edgeCleanup: true });
    // Just verify it produces a valid PNG
    const meta = await sharp(outPath).metadata();
    expect(meta.format).toBe('png');
  });
});

describe('reducePalette', () => {
  it('returns palette with requested number of colors', async () => {
    const outPath = join(OUTPUT, 'reduced.png');
    const result = await reducePalette(SHEET_PATH, outPath, 4);
    expect(result.palette.length).toBeGreaterThan(0);
    expect(result.palette.length).toBeLessThanOrEqual(4);
  });
});

describe('assembleTileset', () => {
  it('assembles tiles into a tileset image', async () => {
    const outPath = join(OUTPUT, 'tileset.png');
    const result = await assembleTileset([TILE1_PATH, TILE2_PATH], outPath, 16, 16);

    expect(result.tileWidth).toBe(16);
    expect(result.tileHeight).toBe(16);
    expect(result.tiles.length).toBe(2);
    expect(existsSync(outPath)).toBe(true);

    const meta = await sharp(outPath).metadata();
    // 2 tiles → 2 columns × 1 row → 32×16
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(16);
  });
});

describe('batchProcess', () => {
  it('converts format', async () => {
    const outDir = join(OUTPUT, 'batch');
    const result = await batchProcess([SHEET_PATH], outDir, { format: 'webp' });

    expect(result.length).toBe(1);
    expect(result[0].success).toBe(true);
    expect(result[0].output).toMatch(/\.webp$/);
    expect(existsSync(result[0].output)).toBe(true);
  });

  it('resizes images', async () => {
    const outDir = join(OUTPUT, 'batch_resize');
    const result = await batchProcess([SHEET_PATH], outDir, {
      resize: { width: 64, height: 32 },
    });

    expect(result[0].success).toBe(true);
    const meta = await sharp(result[0].output).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(32);
  });

  it('crops images', async () => {
    const outDir = join(OUTPUT, 'batch_crop');
    const result = await batchProcess([SHEET_PATH], outDir, {
      crop: { x: 0, y: 0, width: 32, height: 32 },
    });

    expect(result[0].success).toBe(true);
    const meta = await sharp(result[0].output).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
  });

  it('handles multiple files', async () => {
    const outDir = join(OUTPUT, 'batch_multi');
    const result = await batchProcess([SHEET_PATH, TILE1_PATH], outDir, { format: 'png' });

    expect(result.length).toBe(2);
    expect(result.every(r => r.success)).toBe(true);
  });

  it('reports failure for non-existent files', async () => {
    const outDir = join(OUTPUT, 'batch_fail');
    const result = await batchProcess(['/nonexistent.png'], outDir, {});

    expect(result[0].success).toBe(false);
  });
});
