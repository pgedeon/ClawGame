/**
 * Route-contract tests for POST /api/projects/:projectId/export after the
 * legacy canvas-generator deletion (retro-2 ruling #2):
 *
 *   - format:'phaser-html' and omitted format → 201 via exportToPhaserHTML
 *   - explicit legacy formats ('html', 'zip') → 400 unsupported
 *
 * Real Fastify instance + real project fixture on disk (same pattern as
 * hosted.test.ts); no network, no mocks of the code under test.
 */
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exportRoutes } from '../routes/exportRoutes';
import { ProjectService } from '../services/projectService';

const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(exportRoutes);
  await app.ready();
  return app;
}

async function createFixtureProject(name = 'Export Route Fixture') {
  const projects = new ProjectService(mockLogger);
  const { id } = await projects.createProject({ name, genre: 'platformer', artStyle: 'pixel' });
  const scenePath = join(process.env.PROJECTS_DIR as string, id, 'scenes', 'main-scene.json');
  await writeFile(scenePath, JSON.stringify({ name: 'Route Probe', entities: [] }, null, 2), 'utf-8');
  return id;
}

describe('POST /api/projects/:projectId/export — format contract after legacy deletion', () => {
  it('rejects the deleted legacy canvas format with 400', async () => {
    const app = await buildApp();
    const projectId = await createFixtureProject();

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/export`,
      payload: { format: 'html' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('phaser-html');
  });

  it('defaults an omitted format to phaser-html (201)', async () => {
    const app = await buildApp();
    const projectId = await createFixtureProject();

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/export`,
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().format).toBe('phaser-html');
  });
});
