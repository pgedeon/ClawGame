/**
 * Fixture-based route tests for the share/publish slice-1 core:
 *
 *   POST /api/projects/:projectId/share  → fresh export + capability-token host
 *   GET  /share/:token                   → serves the standalone phaser-html
 *   DELETE /api/projects/:projectId/hosted/:hostedId → removes html+meta+share.json
 *
 * Fixtures are real: projects created through ProjectService into the tempdir
 * PROJECTS_DIR (src/test/setup.ts redirects PROJECTS_DIR/ASSETS_DIR/EXPORTS_DIR/
 * HOSTED_DIR before any service module is imported), served through a real
 * Fastify instance with hostedRoutes registered. No network, no mocks of the
 * code under test.
 */
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hostedRoutes } from '../routes/hostedRoutes';
import { HostedService } from '../services/hostedService';
import { ProjectService } from '../services/projectService';

const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
const HOSTED_DIR = process.env.HOSTED_DIR as string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(hostedRoutes);
  await app.ready();
  return app;
}

/** Fixture: a real project on disk with a distinctive scene name marker. */
async function createFixtureProject(name = 'Share Fixture', sceneName = 'Probe Scene') {
  const projects = new ProjectService(mockLogger);
  const { id } = await projects.createProject({ name, genre: 'platformer', artStyle: 'pixel' });
  const scenePath = join(process.env.PROJECTS_DIR as string, id, 'scenes', 'main-scene.json');
  await writeFile(
    scenePath,
    JSON.stringify({ name: sceneName, entities: [] }, null, 2),
    'utf-8',
  );
  return { id, scenePath };
}

async function shareProject(app: any, projectId: string) {
  return app.inject({ method: 'POST', url: `/api/projects/${projectId}/share` });
}

describe('POST /api/projects/:projectId/share — capability-token creation', () => {
  it('creates a fresh non-expiring share with uuid token and all three artifacts', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject();

    const res = await shareProject(app, projectId);
    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.hosted.projectId).toBe(projectId);
    // Capability tokens are unguessable uuids — no timestamp structure.
    expect(body.hosted.id).toMatch(UUID_RE);
    expect(body.url).toContain(`/share/${body.hosted.id}`);
    // Share path passes expiresInDays:null → no expiry (CEO ruling: dying links
    // are worse than disk usage; manual delete only).
    expect(body.hosted.expiresAt ?? null).toBeNull();

    const hostedDir = HOSTED_DIR;
    expect(existsSync(join(hostedDir, `${body.hosted.id}.html`))).toBe(true);
    expect(existsSync(join(hostedDir, `${body.hosted.id}.meta.json`))).toBe(true);
    expect(existsSync(join(hostedDir, `${body.hosted.id}.share.json`))).toBe(true);

    const sharePayload = JSON.parse(
      await readFile(join(hostedDir, `${body.hosted.id}.share.json`), 'utf-8'),
    );
    expect(sharePayload.schema).toBe(1);
    expect(sharePayload.originProjectId).toBe(projectId);
    expect(sharePayload.sourceIncluded).toBe(true);

    const meta = JSON.parse(
      await readFile(join(hostedDir, `${body.hosted.id}.meta.json`), 'utf-8'),
    );
    expect(meta.expiresAt ?? null).toBeNull();
    expect(meta.sourceIncluded).toBe(true);

    await app.close();
  });

  it('reports stage:"export" for an unknown project instead of hosting a dead link', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/does-not-exist/share',
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.stage).toBe('export');
    await app.close();
  });
});

describe('GET /share/:token — validation and serving', () => {
  it('serves the standalone game html with injected bar, remix CTA, no Expires line', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Serve Me', 'MarkerScene One');
    const created = (await (await shareProject(app, projectId)).json()) as any;

    const res = await app.inject({ method: 'GET', url: `/share/${created.hosted.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    // Stored-XSS mitigation mandatory in slice 1 (design §7 risk 2).
    expect(res.headers['content-security-policy']).toContain('sandbox');
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    const html = res.body;
    expect(html).toContain('GAME_HOSTED_METADATA');
    // Recipient landing chrome per US-2/S3 + CEO task: remix CTA present,
    // honest "Made with ClawGame" plain text (no dead clawgame.dev link).
    expect(html).toContain('Remix this game');
    expect(html).toContain('/remix/');
    expect(html).toContain('Made with ClawGame');
    expect(html).not.toContain('clawgame.dev');
    // Non-expiring shares must not print "Expires: Invalid Date".
    expect(html).not.toContain('Expires:');
    // Fresh export carried the CURRENT scene state (scene-name marker compiles
    // into the scene class name).
    expect(html).toContain('MarkerSceneOneScene');

    await app.close();
  });

  it('404s cleanly for unknown tokens', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/share/not-a-real-token' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBeTruthy();
    await app.close();
  });

  it('each share is its own snapshot: re-share after an edit yields a new token while the old link keeps playing the old state', async () => {
    const app = await buildApp();
    const { id: projectId, scenePath } = await createFixtureProject('Snapshot Game', 'Scene V1');

    const first = (await (await shareProject(app, projectId)).json()) as any;
    const firstToken = first.hosted.id;

    // Creator edits the scene, then shares again.
    await writeFile(
      scenePath,
      JSON.stringify({ name: 'Scene V2', entities: [] }, null, 2),
      'utf-8',
    );
    const second = (await (await shareProject(app, projectId)).json()) as any;
    const secondToken = second.hosted.id;

    expect(secondToken).not.toBe(firstToken);

    const oldRes = await app.inject({ method: 'GET', url: `/share/${firstToken}` });
    const newRes = await app.inject({ method: 'GET', url: `/share/${secondToken}` });
    expect(oldRes.statusCode).toBe(200);
    expect(newRes.statusCode).toBe(200);
    expect(oldRes.body).toContain('SceneV1Scene');
    expect(newRes.body).toContain('SceneV2Scene');

    await app.close();
  });

  it('legacy /api/hosted/:id/view still serves the same artifact', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Legacy Route Game');
    const { hosted } = await (await shareProject(app, projectId)).json() as any;

    const res = await app.inject({ method: 'GET', url: `/api/hosted/${hosted.id}/view` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('GAME_HOSTED_METADATA');
    await app.close();
  });
});

describe('Legacy expiring hosts (ExportPage power path) keep their semantics', () => {
  it('expiresInDays:30 produces expiring meta whose html shows the Expires line', async () => {
    const service = new HostedService(mockLogger);
    const { id: projectId } = await createFixtureProject('Power Path Game');

    // A real export artifact must exist in EXPORTS_DIR for the legacy path.
    const { ExportService } = await import('../services/exportService');
    const exportService = new ExportService(mockLogger);
    const exported = await exportService.exportToPhaserHTML(projectId, { format: 'phaser-html' });

    const hosted = await service.hostExport(projectId, exported.filename, { expiresInDays: 30 });
    expect(hosted.id).toMatch(UUID_RE);
    expect(typeof hosted.expiresAt).toBe('string');

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/share/${hosted.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Expires:');
    await app.close();
  });

  it('expired entries return 410 and are removed by cleanupExpired including the share payload', async () => {
    const service = new HostedService(mockLogger);
    const { id: projectId } = await createFixtureProject('Doomed Game');
    const { ExportService } = await import('../services/exportService');
    const exportService = new ExportService(mockLogger);
    const exported = await exportService.exportToPhaserHTML(projectId, { format: 'phaser-html' });
    const hosted = await service.hostExport(projectId, exported.filename, { expiresInDays: 30 });

    // Force expiry by rewriting meta with a past timestamp (fixture manipulation).
    const metaPath = join(HOSTED_DIR, `${hosted.id}.meta.json`);
    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    meta.expiresAt = new Date(Date.now() - 1000).toISOString();
    await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    const app = await buildApp();
    const gone = await app.inject({ method: 'GET', url: `/share/${hosted.id}` });
    expect(gone.statusCode).toBe(410);

    const cleaned = await service.cleanupExpired();
    expect(cleaned).toBeGreaterThanOrEqual(1);
    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.html`))).toBe(false);
    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.meta.json`))).toBe(false);
    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.share.json`))).toBe(false);
    await app.close();
  });
});

describe('DELETE /api/projects/:projectId/hosted/:hostedId', () => {
  it('removes html+meta+share.json so the link then 404s cleanly', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Delete Me');
    const { hosted } = await (await shareProject(app, projectId)).json() as any;

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectId}/hosted/${hosted.id}`,
    });
    expect(del.statusCode).toBe(200);

    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.html`))).toBe(false);
    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.meta.json`))).toBe(false);
    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.share.json`))).toBe(false);

    const res = await app.inject({ method: 'GET', url: `/share/${hosted.id}` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
