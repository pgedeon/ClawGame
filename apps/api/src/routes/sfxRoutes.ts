/**
 * SFX Generation Routes — M11: Generative Media Forge
 *
 * REST API for generating and managing sound effect packs for game projects.
 */

import { FastifyInstance } from 'fastify';
import { SFXGenerationService, SFXPackRequest } from '../services/sfxGenerationService';

const sfxService = new SFXGenerationService();

export async function sfxRoutes(app: FastifyInstance) {
  // Generate a SFX pack for a project
  app.post<{
    Params: { projectId: string };
    Body: { genre: string; style?: string; count?: number };
  }>('/api/projects/:projectId/sfx/generate', async (req, reply) => {
    const { projectId } = req.params;
    const { genre, style, count } = req.body;

    if (!genre) {
      return reply.status(400).send({ error: 'genre is required' });
    }

    if (count !== undefined && (count < 1 || count > 50)) {
      return reply.status(400).send({ error: 'count must be between 1 and 50' });
    }

    try {
      const pack = await sfxService.generatePack({
        projectId,
        gameGenre: genre,
        style,
        count,
      });
      return { pack };
    } catch (err: any) {
      req.log.error(err, 'SFX generation failed');
      return reply.status(500).send({ error: 'SFX generation failed', details: err.message });
    }
  });

  // List SFX packs for a project
  app.get<{
    Params: { projectId: string };
  }>('/api/projects/:projectId/sfx/packs', async (req, reply) => {
    const { projectId } = req.params;
    const packs = await sfxService.listPacks(projectId);
    return { packs };
  });

  // Get a single SFX descriptor
  app.get<{
    Params: { projectId: string; name: string };
  }>('/api/projects/:projectId/sfx/:name', async (req, reply) => {
    const { projectId, name } = req.params;
    const sfx = await sfxService.getSFX(projectId, name);
    if (!sfx) {
      return reply.status(404).send({ error: 'SFX not found' });
    }
    return sfx;
  });

  // Delete a SFX descriptor
  app.delete<{
    Params: { projectId: string; name: string };
  }>('/api/projects/:projectId/sfx/:name', async (req, reply) => {
    const { projectId, name } = req.params;
    const deleted = await sfxService.deleteSFX(projectId, name);
    if (!deleted) {
      return reply.status(404).send({ error: 'SFX not found' });
    }
    return { success: true };
  });
}
