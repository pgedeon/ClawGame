/**
 * @clawgame/api - Image Processing Routes
 * M10: Asset Factory Core — sprite analysis, slicing, pixel pipeline, tileset forge, batch
 */

import { FastifyInstance } from 'fastify';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import {
  analyzeSprite,
  sliceSpriteSheet,
  pixelize,
  reducePalette,
  assembleTileset,
  batchProcess,
} from '../services/imageProcessingService';

const ASSET_BASE = process.env.PROJECTS_DIR || './data/projects';

export async function imageProcessingRoutes(app: FastifyInstance) {
  // Analyze a sprite/image
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/assets/analyze',
    async (req, reply) => {
      const { projectId } = req.params;
      const { assetPath } = req.body as { assetPath: string };

      const fullPath = join(ASSET_BASE, projectId, assetPath);
      if (!existsSync(fullPath)) {
        return reply.status(404).send({ error: 'File not found' });
      }

      const analysis = await analyzeSprite(fullPath);
      return analysis;
    }
  );

  // Slice a sprite sheet into frames
  app.post<{
    Params: { projectId: string };
    Body: {
      assetPath: string;
      frameWidth: number;
      frameHeight: number;
      name: string;
    };
  }>('/api/projects/:projectId/assets/slice', async (req, reply) => {
    const { projectId } = req.params;
    const { assetPath, frameWidth, frameHeight, name } = req.body;

    const fullPath = join(ASSET_BASE, projectId, assetPath);
    if (!existsSync(fullPath)) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const outputDir = join(ASSET_BASE, projectId, 'processed', name);
    const result = await sliceSpriteSheet(fullPath, outputDir, { frameWidth, frameHeight, name });
    return result;
  });

  // Pixelize an image
  app.post<{
    Params: { projectId: string };
    Body: {
      assetPath: string;
      pixelSize: number;
      palette?: string[];
      edgeCleanup?: boolean;
    };
  }>('/api/projects/:projectId/assets/pixelize', async (req, reply) => {
    const { projectId } = req.params;
    const { assetPath, pixelSize, palette, edgeCleanup } = req.body;

    const fullPath = join(ASSET_BASE, projectId, assetPath);
    if (!existsSync(fullPath)) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const name = assetPath.replace(/\.[^.]+$/, '');
    const outputPath = join(ASSET_BASE, projectId, 'processed', `${name}_pixel.png`);
    mkdirSync(join(ASSET_BASE, projectId, 'processed'), { recursive: true });

    const result = await pixelize(fullPath, outputPath, { pixelSize, palette, edgeCleanup });
    return result;
  });

  // Reduce palette
  app.post<{
    Params: { projectId: string };
    Body: { assetPath: string; maxColors: number };
  }>('/api/projects/:projectId/assets/palette-reduce', async (req, reply) => {
    const { projectId } = req.params;
    const { assetPath, maxColors } = req.body;

    const fullPath = join(ASSET_BASE, projectId, assetPath);
    if (!existsSync(fullPath)) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const name = assetPath.replace(/\.[^.]+$/, '');
    const outputPath = join(ASSET_BASE, projectId, 'processed', `${name}_reduced.png`);
    mkdirSync(join(ASSET_BASE, projectId, 'processed'), { recursive: true });

    const result = await reducePalette(fullPath, outputPath, maxColors);
    return result;
  });

  // Assemble tileset from tiles
  app.post<{
    Params: { projectId: string };
    Body: {
      tilePaths: string[];
      tileWidth: number;
      tileHeight: number;
    };
  }>('/api/projects/:projectId/assets/assemble-tileset', async (req, reply) => {
    const { projectId } = req.params;
    const { tilePaths, tileWidth, tileHeight } = req.body;

    const fullPaths = tilePaths.map(p => join(ASSET_BASE, projectId, p));
    const outputPath = join(ASSET_BASE, projectId, 'processed', 'tileset.png');
    mkdirSync(join(ASSET_BASE, projectId, 'processed'), { recursive: true });

    const result = await assembleTileset(fullPaths, outputPath, tileWidth, tileHeight);
    return result;
  });

  // Batch process assets
  app.post<{
    Params: { projectId: string };
    Body: {
      assetPaths: string[];
      options: {
        resize?: { width: number; height: number; fit?: string };
        format?: 'png' | 'webp' | 'jpg';
        trim?: boolean;
        crop?: { x: number; y: number; width: number; height: number };
      };
    };
  }>('/api/projects/:projectId/assets/batch', async (req, reply) => {
    const { projectId } = req.params;
    const { assetPaths, options } = req.body;

    const fullPaths = assetPaths.map(p => join(ASSET_BASE, projectId, p));
    const outputDir = join(ASSET_BASE, projectId, 'processed', 'batch');
    mkdirSync(outputDir, { recursive: true });

    const batchOptions = {
      ...options,
      resize: options.resize ? { ...options.resize, fit: (options.resize.fit as any) || 'contain' } : undefined,
    };

    const result = await batchProcess(fullPaths, outputDir, batchOptions);
    return { results: result };
  });
}
