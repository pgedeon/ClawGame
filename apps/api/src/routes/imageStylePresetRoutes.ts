/**
 * Image Style Preset Routes — M11: Generative Media Forge
 *
 * REST API for browsing style presets and generating assets from them.
 */

import { FastifyInstance } from 'fastify';
import { ImageStylePresetService, type AssetRole } from '../services/imageStylePresetService';

export async function imageStylePresetRoutes(app: FastifyInstance) {
  const service = new ImageStylePresetService(app.log);

  // List all presets (optional ?role= filter)
  app.get<{
    Querystring: { role?: AssetRole };
  }>('/api/image-presets', async (req) => {
    const { role } = req.query;
    const presets = service.listPresets(role);
    return { presets, total: presets.length };
  });

  // List available roles
  app.get('/api/image-presets/roles', async () => {
    const roles = service.listRoles();
    return { roles };
  });

  // Get a single preset
  app.get<{
    Params: { presetId: string };
  }>('/api/image-presets/:presetId', async (req, reply) => {
    const preset = service.getPreset(req.params.presetId);
    if (!preset) {
      return reply.status(404).send({ error: 'Preset not found' });
    }
    return preset;
  });

  // Generate assets from a preset
  app.post<{
    Body: {
      presetId: string;
      description: string;
      artStyle?: AssetRole extends never ? never : 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
      width?: number;
      height?: number;
      count?: number;
      projectId?: string;
    };
  }>('/api/image-presets/generate', async (req, reply) => {
    const { presetId, description, artStyle, width, height, count, projectId } = req.body;

    if (!presetId) {
      return reply.status(400).send({ error: 'presetId is required' });
    }
    if (!description || description.trim().length === 0) {
      return reply.status(400).send({ error: 'description is required' });
    }
    if (description.length > 500) {
      return reply.status(400).send({ error: 'description must be ≤500 characters' });
    }

    try {
      const result = await service.generateFromPreset({
        projectId: projectId || 'anonymous',
        presetId,
        description: description.trim(),
        artStyle,
        width,
        height,
        count,
      });
      return result;
    } catch (err: any) {
      req.log.error(err, 'Preset generation failed');
      return reply.status(500).send({ error: 'Generation failed', details: err.message });
    }
  });
}
