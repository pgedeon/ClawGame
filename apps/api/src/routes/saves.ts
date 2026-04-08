/**
 * @clawgame/api - Save/Load Routes
 * REST endpoints for game save state management.
 *
 * POST   /api/projects/:id/saves          – create/overwrite a save
 * GET    /api/projects/:id/saves           – list all saves (summary)
 * GET    /api/projects/:id/saves/:slot     – load a specific save
 * DELETE /api/projects/:id/saves/:slot     – delete a save
 */

import { FastifyInstance } from 'fastify';
import { SaveService, GameSave, SaveSlotInfo } from '../services/saveService';

const saveService = new SaveService();

export async function saveRoutes(app: FastifyInstance) {
  // ── Create / overwrite a save ──
  app.post<{
    Params: { id: string };
    Body: GameSave;
  }>('/api/projects/:id/saves', async (request, reply) => {
    const { id: projectId } = request.params;
    const saveData = request.body;

    if (!saveData || !saveData.slot) {
      reply.code(400);
      return { error: 'Missing required field: slot' };
    }

    try {
      const saved = await saveService.saveGame(projectId, saveData.slot, saveData);
      return saved;
    } catch (err: any) {
      reply.code(err.message?.includes('Invalid') ? 400 : 500);
      return { error: err.message || 'Failed to save game' };
    }
  });

  // ── List all saves ──
  app.get<{
    Params: { id: string };
  }>('/api/projects/:id/saves', async (request) => {
    const { id: projectId } = request.params;
    const saves: SaveSlotInfo[] = await saveService.listSaves(projectId);
    return { saves };
  });

  // ── Load a specific save ──
  app.get<{
    Params: { id: string; slot: string };
  }>('/api/projects/:id/saves/:slot', async (request, reply) => {
    const { id: projectId, slot } = request.params;

    try {
      const save = await saveService.loadGame(projectId, slot);
      if (!save) {
        reply.code(404);
        return { error: `No save found in slot "${slot}"` };
      }
      return save;
    } catch (err: any) {
      reply.code(err.message?.includes('Invalid') ? 400 : 500);
      return { error: err.message || 'Failed to load save' };
    }
  });

  // ── Delete a save ──
  app.delete<{
    Params: { id: string; slot: string };
  }>('/api/projects/:id/saves/:slot', async (request, reply) => {
    const { id: projectId, slot } = request.params;

    try {
      const deleted = await saveService.deleteSave(projectId, slot);
      if (!deleted) {
        reply.code(404);
        return { error: `No save found in slot "${slot}"` };
      }
      return { success: true };
    } catch (err: any) {
      reply.code(err.message?.includes('Invalid') ? 400 : 500);
      return { error: err.message || 'Failed to delete save' };
    }
  });
}
