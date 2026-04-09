/**
 * @clawgame/api - Image Processing Service
 * Sprite analysis, slicing, pixel conversion, tileset assembly, and batch utilities.
 * M10: Asset Factory Core
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

// ── Types ──

export interface SpriteAnalysis {
  width: number;
  height: number;
  channels: number;
  hasAlpha: boolean;
  detectedGrid?: {
    cols: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
  };
  dominantColors: string[];
}

export interface SliceResult {
  frames: Array<{
    index: number;
    path: string;
    width: number;
    height: number;
  }>;
  manifest: SpriteManifest;
}

export interface SpriteManifest {
  name: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  animations?: Record<string, { start: number; end: number; loop: boolean }>;
}

export interface PixelOptions {
  pixelSize: number;       // block size for pixelation
  palette?: string[];      // hex colors for palette reduction
  edgeCleanup?: boolean;
}

export interface BatchOptions {
  resize?: { width: number; height: number; fit?: 'cover' | 'contain' | 'fill' };
  format?: 'png' | 'webp' | 'jpg';
  trim?: boolean;
  crop?: { x: number; y: number; width: number; height: number };
}

export interface TilesetInfo {
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  tiles: Array<{ id: number; x: number; y: number }>;
  autotile?: Record<string, number[]>;  // bitmask → tile ids
}

// ── Sprite Analyzer ──

export async function analyzeSprite(filePath: string): Promise<SpriteAnalysis> {
  const meta = await sharp(filePath).metadata();
  

  const width = meta.width || 0;
  const height = meta.height || 0;
  const hasAlpha = meta.channels === 4;
  const channels = meta.channels || 3;

  // Detect grid (common game sprite sizes: 16, 32, 48, 64, 128)
  const detectedGrid = detectGrid(width, height);

  // Extract dominant colors
  const dominantColors = [
    
    // Get more colors via quantization
    ...(await getDominantColors(filePath, 4)),
  ];

  return {
    width,
    height,
    channels,
    hasAlpha,
    detectedGrid,
    dominantColors: [...new Set(dominantColors)],
  };
}

// ── Slicer ──

export async function sliceSpriteSheet(
  filePath: string,
  outputPath: string,
  options: { frameWidth: number; frameHeight: number; name: string }
): Promise<SliceResult> {
  const { frameWidth, frameHeight, name } = options;
  const meta = await sharp(filePath).metadata();
  const imgWidth = meta.width || 0;
  const imgHeight = meta.height || 0;

  const cols = Math.floor(imgWidth / frameWidth);
  const rows = Math.floor(imgHeight / frameHeight);
  const frameCount = cols * rows;

  mkdirSync(outputPath, { recursive: true });

  const frames: SliceResult['frames'] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const framePath = join(outputPath, `${name}_${String(index).padStart(3, '0')}.png`);

      await sharp(filePath)
        .extract({
          left: col * frameWidth,
          top: row * frameHeight,
          width: frameWidth,
          height: frameHeight,
        })
        .png()
        .toFile(framePath);

      frames.push({
        index,
        path: framePath,
        width: frameWidth,
        height: frameHeight,
      });
    }
  }

  const manifest: SpriteManifest = {
    name,
    frameWidth,
    frameHeight,
    columns: cols,
    rows,
    frameCount,
  };

  // Write manifest
  writeFileSync(join(outputPath, `${name}_manifest.json`), JSON.stringify(manifest, null, 2));

  return { frames, manifest };
}

// ── Pixel Pipeline ──

export async function pixelize(
  inputPath: string,
  outputPath: string,
  options: PixelOptions
): Promise<{ path: string; width: number; height: number }> {
  const meta = await sharp(inputPath).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  let pipeline = sharp(inputPath);

  // Pixelate by downscaling then upscaling
  const smallWidth = Math.max(1, Math.floor(width / options.pixelSize));
  const smallHeight = Math.max(1, Math.floor(height / options.pixelSize));

  pipeline = await pipeline
    .resize(smallWidth, smallHeight, { kernel: 'nearest' })
    .resize(width, height, { kernel: 'nearest' });

  // Palette reduction
  if (options.palette && options.palette.length > 0) {
    // Quantize to palette using posterize effect
    pipeline = pipeline.recomb([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]) as unknown as sharp.Sharp;
  }

  // Edge cleanup — slight sharpen
  if (options.edgeCleanup) {
    pipeline = pipeline.sharpen({ sigma: 0.5 });
  }

  await pipeline.png().toFile(outputPath);

  return { path: outputPath, width, height };
}

export async function reducePalette(
  inputPath: string,
  outputPath: string,
  maxColors: number
): Promise<{ path: string; palette: string[] }> {
  // Use posterize to reduce colors, then extract palette
  const levels = Math.ceil(Math.log2(maxColors));

  await sharp(inputPath)
    .png()
    .toFile(outputPath);

  // Extract palette from the result
  const palette = await getDominantColors(inputPath, maxColors);

  return { path: outputPath, palette };
}

// ── Tileset Forge ──

export async function assembleTileset(
  tilePaths: string[],
  outputPath: string,
  tileWidth: number,
  tileHeight: number
): Promise<TilesetInfo> {
  const tilesPerRow = Math.ceil(Math.sqrt(tilePaths.length));
  const rows = Math.ceil(tilePaths.length / tilesPerRow);

  const canvasWidth = tilesPerRow * tileWidth;
  const canvasHeight = rows * tileHeight;

  // Create base canvas
  const tiles: TilesetInfo['tiles'] = [];
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < tilePaths.length; i++) {
    const col = i % tilesPerRow;
    const row = Math.floor(i / tilesPerRow);
    const x = col * tileWidth;
    const y = row * tileHeight;

    tiles.push({ id: i, x, y });

    // Ensure tile is the right size
    const tileBuffer = await sharp(tilePaths[i])
      .resize(tileWidth, tileHeight, { fit: 'fill' })
      .png()
      .toBuffer();

    composites.push({ input: tileBuffer, left: x, top: y });
  }

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);

  return {
    tileWidth,
    tileHeight,
    columns: tilesPerRow,
    rows,
    tiles,
  };
}

// ── Batch Utilities ──

export async function batchProcess(
  inputPaths: string[],
  outputDir: string,
  options: BatchOptions
): Promise<Array<{ input: string; output: string; success: boolean }>> {
  mkdirSync(outputDir, { recursive: true });
  const results: Array<{ input: string; output: string; success: boolean }> = [];

  for (const inputPath of inputPaths) {
    const name = basename(inputPath, extname(inputPath));
    const format = options.format || 'png';
    const outputPath = join(outputDir, `${name}.${format}`);

    try {
      let pipeline = sharp(inputPath);

      // Crop first
      if (options.crop) {
        pipeline = pipeline.extract({
          left: options.crop.x,
          top: options.crop.y,
          width: options.crop.width,
          height: options.crop.height,
        });
      }

      // Trim transparent pixels
      if (options.trim) {
        const trimmed = await pipeline.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
        pipeline = sharp(trimmed);
      }

      // Resize
      if (options.resize) {
        const fit = options.resize.fit || 'contain';
        pipeline = pipeline.resize(options.resize.width, options.resize.height, { fit: fit as keyof typeof sharp.fit });
      }

      // Output format
      switch (format) {
        case 'webp': await pipeline.webp().toFile(outputPath); break;
        case 'jpg': await pipeline.jpeg().toFile(outputPath); break;
        default: await pipeline.png().toFile(outputPath); break;
      }

      results.push({ input: inputPath, output: outputPath, success: true });
    } catch (err) {
      results.push({ input: inputPath, output: outputPath, success: false });
    }
  }

  return results;
}

// ── Helpers ──

function detectGrid(width: number, height: number): SpriteAnalysis['detectedGrid'] | undefined {
  const commonSizes = [16, 32, 48, 64, 96, 128, 256];

  for (const size of commonSizes) {
    if (width % size === 0 && height % size === 0) {
      const cols = width / size;
      const rows = height / size;
      // Likely a sprite sheet if multiple frames in at least one direction
      if (cols >= 1 && rows >= 1 && (cols > 1 || rows > 1)) {
        return {
          cols,
          rows,
          frameWidth: size,
          frameHeight: size,
        };
      }
    }
  }

  // Try non-square: detect rows/cols independently
  for (const fw of commonSizes) {
    if (width % fw !== 0) continue;
    for (const fh of commonSizes) {
      if (height % fh !== 0) continue;
      const cols = width / fw;
      const rows = height / fh;
      if (cols >= 1 && rows >= 1 && (cols > 1 || rows > 1)) {
        return { cols, rows, frameWidth: fw, frameHeight: fh };
      }
    }
  }

  return undefined;
}

function rgbToHex(r: { mean: number }, g: { mean: number }, b: { mean: number }): string {
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r.mean)}${toHex(g.mean)}${toHex(b.mean)}`;
}

async function getDominantColors(filePath: string, count: number): Promise<string[]> {
  try {
    // Resize to small for fast analysis
    const { data, info } = await sharp(filePath)
      .resize(64, 64, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = info.width * info.height;
    const colorMap = new Map<string, number>();

    for (let i = 0; i < pixelCount; i++) {
      const offset = i * info.channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      // Quantize to reduce noise (4-bit per channel)
      const qr = (r >> 4) << 4;
      const qg = (g >> 4) << 4;
      const qb = (b >> 4) << 4;
      const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }

    return [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([hex]) => hex);
  } catch {
    return [];
  }
}
