/**
 * Export flow end-to-end validation test
 * Validates the full lifecycle: create project → export → list → download → delete
 *
 * Note: exportRoutes.ts uses a module-level singleton for ExportService.
 * We use a single app instance for the happy-path lifecycle test to avoid
 * stale-service issues across app boundaries.
 */
import { describe, it, expect, afterAll } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from '../routes/projects';
import { exportRoutes } from '../routes/exportRoutes';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const EXPORTS_DIR = process.env.EXPORTS_DIR || './data/exports';

async function cleanupExports(projectId: string) {
  if (!existsSync(EXPORTS_DIR)) return;
  const files = await readdir(EXPORTS_DIR);
  for (const f of files) {
    if (f.includes(projectId)) {
      await unlink(join(EXPORTS_DIR, f)).catch(() => {});
    }
  }
}

async function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: '*' });
  app.register(projectRoutes);
  app.register(exportRoutes);
  return app;
}

describe('Export Flow E2E', () => {
  afterAll(async () => {
    if (!existsSync(EXPORTS_DIR)) return;
    const files = await readdir(EXPORTS_DIR);
    for (const f of files) {
      if (f.includes('Export-Test') || f.includes('No-Asset-Export')) {
        await unlink(join(EXPORTS_DIR, f)).catch(() => {});
      }
    }
  });

  it('should complete full export lifecycle: create → export (with assets) → list → download → delete → re-export (no assets)', async () => {
    const app = await buildApp();

    // 1. Create test project
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Export Test Game', genre: 'platformer', artStyle: 'pixel' },
    });
    expect(createRes.statusCode).toBe(201);
    const projectId = createRes.json().id;

    try {
      // 2. Export to HTML with assets
      const exportRes = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/export`,
        payload: { includeAssets: true },
      });
      expect(exportRes.statusCode).toBe(201);
      const exportResult = exportRes.json();

      // Validate export result shape
      expect(exportResult.projectId).toBe(projectId);
      expect(exportResult.projectName).toBe('Export Test Game');
      expect(exportResult.format).toBe('html');
      expect(exportResult.size).toBeGreaterThan(0);
      expect(exportResult.filename).toMatch(/\.html$/);
      expect(exportResult.downloadUrl).toContain(projectId);
      expect(exportResult.createdAt).toBeTruthy();

      // 3. List exports — should include our export
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/exports`,
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = listRes.json();
      expect(listBody.exports).toHaveLength(1);
      expect(listBody.exports[0].filename).toBe(exportResult.filename);
      expect(listBody.exports[0].projectId).toBe(projectId);

      // 4. Download the export file
      const downloadRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/exports/${exportResult.filename}`,
      });
      expect(downloadRes.statusCode).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('text/html');
      const htmlBody = downloadRes.body;
      // Validate standalone HTML structure
      expect(htmlBody).toContain('<!DOCTYPE html>');
      expect(htmlBody).toContain('Export Test Game');
      expect(htmlBody).toContain('GAME_DATA');
      expect(htmlBody).toContain('GameEngine');
      expect(htmlBody).toContain('Built with ClawGame');

      // 5. Delete the export
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${projectId}/exports/${exportResult.filename}`,
      });
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json().success).toBe(true);

      // 6. Verify export is gone
      const listAfterDeleteRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/exports`,
      });
      expect(listAfterDeleteRes.json().exports).toHaveLength(0);

      // 7. Download should 404
      const missingRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/exports/${exportResult.filename}`,
      });
      expect(missingRes.statusCode).toBe(404);

      // 8. Re-export without assets
      const noAssetExportRes = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/export`,
        payload: { includeAssets: false },
      });
      expect(noAssetExportRes.statusCode).toBe(201);
      const noAssetResult = noAssetExportRes.json();
      expect(noAssetResult.includesAssets).toBe(false);
      expect(noAssetResult.assetCount).toBe(0);

      // Verify HTML contains game data with empty assets
      const noAssetDownloadRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/exports/${noAssetResult.filename}`,
      });
      expect(noAssetDownloadRes.body).toContain('Export Test Game');
      // JSON.stringify(gameData, null, 2) produces: "assets": []
      const assetsMatch = noAssetDownloadRes.body.match(/"assets"\s*:\s*\[\]/);
      expect(assetsMatch).not.toBeNull();

      // Cleanup
      await cleanupExports(projectId);
    } finally {
      await app.close();
    }
  });

  it('should return error for export of non-existent project', async () => {
    const app = await buildApp();

    const exportRes = await app.inject({
      method: 'POST',
      url: '/api/projects/non-existent-project-id/export',
      payload: {},
    });
    expect(exportRes.statusCode).toBe(500);
    expect(exportRes.json().error).toContain('not found');

    await app.close();
  });

  it('should return 404 when downloading non-existent export', async () => {
    const app = await buildApp();

    const downloadRes = await app.inject({
      method: 'GET',
      url: '/api/projects/some-project/exports/nonexistent.html',
    });
    expect(downloadRes.statusCode).toBe(404);

    await app.close();
  });

  it('should return 404 when deleting non-existent export', async () => {
    const app = await buildApp();

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: '/api/projects/some-project/exports/nonexistent.html',
    });
    expect(deleteRes.statusCode).toBe(404);

    await app.close();
  });
});
