/**
 * Sprite Sheet Routes — M11: Generative Media Forge
 *
 * REST API for generating and managing sprite sheets for game projects.
 */

import { FastifyInstance } from 'fastify';
import { SpriteSheetService, type SpriteAnimationName } from '../services/spriteSheetService';

const spriteService = new SpriteSheetService();

export async function spriteSheetRoutes(app: FastifyInstance) {
  // Generate a sprite sheet from a prompt
  app.post<{
    Params: { projectId: string };
    Body: {
      prompt: string;
      artStyle?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
      frameWidth?: number;
      frameHeight?: number;
      columns?: number;
      rows?: number;
      animations?: SpriteAnimationName[];
    };
  }>('/api/projects/:projectId/sprites/generate', async (req, reply) => {
    const { projectId } = req.params;
    const { prompt, artStyle, frameWidth, frameHeight, columns, rows, animations } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return reply.status(400).send({ error: 'prompt is required' });
    }
    if (prompt.length > 500) {
      return reply.status(400).send({ error: 'prompt must be ≤500 characters' });
    }
    if (frameWidth !== undefined && (frameWidth < 8 || frameWidth > 512)) {
      return reply.status(400).send({ error: 'frameWidth must be between 8 and 512' });
    }
    if (frameHeight !== undefined && (frameHeight < 8 || frameHeight > 512)) {
      return reply.status(400).send({ error: 'frameHeight must be between 8 and 512' });
    }
    if (columns !== undefined && (columns < 1 || columns > 32)) {
      return reply.status(400).send({ error: 'columns must be between 1 and 32' });
    }
    if (rows !== undefined && (rows < 1 || rows > 32)) {
      return reply.status(400).send({ error: 'rows must be between 1 and 32' });
    }

    try {
      const sheet = await spriteService.generate({
        projectId,
        prompt: prompt.trim(),
        artStyle,
        frameWidth,
        frameHeight,
        columns,
        rows,
        animations,
      });
      return { sheet };
    } catch (err: any) {
      req.log.error(err, 'Sprite sheet generation failed');
      return reply.status(500).send({ error: 'Sprite sheet generation failed', details: err.message });
    }
  });

  // List all sprite sheets for a project
  app.get<{
    Params: { projectId: string };
  }>('/api/projects/:projectId/sprites', async (req) => {
    const { projectId } = req.params;
    const sheets = await spriteService.list(projectId);
    return { sheets };
  });

  // Get a single sprite sheet by name
  app.get<{
    Params: { projectId: string; name: string };
  }>('/api/projects/:projectId/sprites/:name', async (req, reply) => {
    const { projectId, name } = req.params;
    const sheet = await spriteService.get(projectId, name);
    if (!sheet) {
      return reply.status(404).send({ error: 'Sprite sheet not found' });
    }
    return sheet;
  });

  // Delete a sprite sheet
  app.delete<{
    Params: { projectId: string; name: string };
  }>('/api/projects/:projectId/sprites/:name', async (req, reply) => {
    const { projectId, name } = req.params;
    const deleted = await spriteService.delete(projectId, name);
    if (!deleted) {
      return reply.status(404).send({ error: 'Sprite sheet not found' });
    }
    return { success: true };
  });
}
