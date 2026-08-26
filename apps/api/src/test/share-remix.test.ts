/**
 * Route tests for the slice-2 remix import flow:
 *
 *   GET /api/share/:token/remix → the .share.json remix payload
 *   (token must exist; expired → 410; legacy shares without a sidecar → typed 404)
 *
 * Plus host-time assertions that the sidecar now carries the REAL payload
 * (verbatim scene + project metadata + reference-only assets) and unit tests
 * for the serialized-size cap. Fixtures are real projects through
 * ProjectService into the tempdir dirs (see setup.ts), served through a real
 * Fastify instance — same pattern as hosted.test.ts.
 */
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hostedRoutes } from '../routes/hostedRoutes';
import {
  HostedService,
  SHARE_PAYLOAD_MAX_BYTES,
  assertPayloadWithinSize,
} from '../services/hostedService';
import { ProjectService } from '../services/projectService';

const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
const HOSTED_DIR = process.env.HOSTED_DIR as string;
const PROJECTS_DIR = process.env.PROJECTS_DIR as string;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(hostedRoutes);
  await app.ready();
  return app;
}

/** Fixture: real project on disk with a distinctive scene marker. */
async function createFixtureProject(name = 'Remix Fixture', sceneName = 'Remix Marker Scene') {
  const projects = new ProjectService(mockLogger);
  const { id } = await projects.createProject({ name, genre: 'platformer', artStyle: 'pixel' });
  const scenePath = join(PROJECTS_DIR, id, 'scenes', 'main-scene.json');
  await writeFile(
    scenePath,
    JSON.stringify({
      name: sceneName,
      entities: [
        { id: 'probe-1', transform: { x: 10, y: 20 }, components: { sprite: { color: '#ff0044' } } },
      ],
    }, null, 2),
    'utf-8',
  );
  return { id, scenePath };
}

async function shareProject(app: any, projectId: string) {
  const res = await app.inject({ method: 'POST', url: `/api/projects/${projectId}/share` });
  expect(res.statusCode).toBe(201);
  return res.json() as any;
}

describe('share sidecar carries the real remix payload at host time', () => {
  it('.share.json contains verbatim scene + project metadata + reference-only assets', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Payload Source', 'Payload Scene X');
    const { hosted } = await shareProject(app, projectId);

    const raw = await readFile(join(HOSTED_DIR, `${hosted.id}.share.json`), 'utf-8');
    const payload = JSON.parse(raw);

    expect(payload.schema).toBe(1);
    expect(payload.originProjectId).toBe(projectId);
    expect(payload.originHostedId).toBe(hosted.id);
    expect(payload.sourceIncluded).toBe(true);
    expect(typeof payload.sharedAt).toBe('string');

    // Project metadata block (name/genre/artStyle/settings passthrough).
    expect(payload.project.name).toBe('Payload Source');
    expect(payload.project.genre).toBe('platformer');
    expect(payload.project.artStyle).toBe('pixel');
    expect(payload.project.settings).toMatchObject({ width: expect.any(Number) });

    // Verbatim scene JSON — entity data survives byte-for-byte semantics.
    expect(payload.scene.name).toBe('Payload Scene X');
    expect(payload.scene.entities).toHaveLength(1);
    expect(payload.scene.entities[0].id).toBe('probe-1');
    expect(payload.scene.entities[0].components.sprite.color).toBe('#ff0044');

    // Assets referenced only (template fixture has none) — no embedded data URIs.
    expect(Array.isArray(payload.assets)).toBe(true);
    expect(payload.assets).toHaveLength(0);
    expect(raw).not.toContain('dataUri');

    await app.close();
  });
});

describe('GET /api/share/:token/remix', () => {
  it('returns the remix payload for a valid token', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Valid Remix', 'Endpoint Scene V1');
    const { hosted } = await shareProject(app, projectId);

    const res = await app.inject({ method: 'GET', url: `/api/share/${hosted.id}/remix` });
    expect(res.statusCode).toBe(200);

    const payload = res.json();
    expect(payload.schema).toBe(1);
    expect(payload.originProjectId).toBe(projectId);
    expect(payload.project.name).toBe('Valid Remix');
    expect(payload.scene.name).toBe('Endpoint Scene V1');

    await app.close();
  });

  it('404s for an unknown token', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/share/not-a-real-token/remix' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBeTruthy();
    await app.close();
  });

  it('404s with a typed code for legacy shares whose sidecar is gone — play still works', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Legacy No Payload');
    const { hosted } = await shareProject(app, projectId);

    // Simulate a pre-slice-2 share: remove the sidecar only.
    await unlink(join(HOSTED_DIR, `${hosted.id}.share.json`));

    const remixRes = await app.inject({ method: 'GET', url: `/api/share/${hosted.id}/remix` });
    expect(remixRes.statusCode).toBe(404);
    expect(remixRes.json().code).toBe('remix_payload_missing');

    // The playable link keeps working (graceful degradation, US-3 AC 6).
    const viewRes = await app.inject({ method: 'GET', url: `/share/${hosted.id}` });
    expect(viewRes.statusCode).toBe(200);

    await app.close();
  });

  it('410s for an expired token', async () => {
    const service = new HostedService(mockLogger);
    const { id: projectId } = await createFixtureProject('Expired Remix');
    const { ExportService } = await import('../services/exportService');
    const exportService = new ExportService(mockLogger);
    const exported = await exportService.exportToPhaserHTML(projectId, { format: 'phaser-html' });
    const hosted = await service.hostExport(projectId, exported.filename, { expiresInDays: 30 });

    const metaPath = join(HOSTED_DIR, `${hosted.id}.meta.json`);
    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    meta.expiresAt = new Date(Date.now() - 1000).toISOString();
    await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/share/${hosted.id}/remix` });
    expect(res.statusCode).toBe(410);
    await app.close();
  });

  it('payload is a snapshot: edits after sharing do not leak into an existing token', async () => {
    const app = await buildApp();
    const { id: projectId, scenePath } = await createFixtureProject('Snapshot Remix', 'Before Edit');
    const { hosted } = await shareProject(app, projectId);

    await writeFile(
      scenePath,
      JSON.stringify({ name: 'After Edit', entities: [] }, null, 2),
      'utf-8',
    );

    const res = await app.inject({ method: 'GET', url: `/api/share/${hosted.id}/remix` });
    expect(res.statusCode).toBe(200);
    expect(res.json().scene.name).toBe('Before Edit');

    await app.close();
  });

  it('delete removes html+meta+share.json so remix then 404s like play does', async () => {
    const app = await buildApp();
    const { id: projectId } = await createFixtureProject('Deleted Remix');
    const { hosted } = await shareProject(app, projectId);

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectId}/hosted/${hosted.id}`,
    });
    expect(del.statusCode).toBe(200);
    expect(existsSync(join(HOSTED_DIR, `${hosted.id}.share.json`))).toBe(false);

    const res = await app.inject({ method: 'GET', url: `/api/share/${hosted.id}/remix` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('serialized payload size cap (design §4)', () => {
  it('rejects payloads over 25 MB and accepts typical small ones', () => {
    expect(SHARE_PAYLOAD_MAX_BYTES).toBe(25 * 1024 * 1024);

    expect(() => assertPayloadWithinSize('{"scene":{}}')).not.toThrow();

    const oversized = 'x'.repeat(SHARE_PAYLOAD_MAX_BYTES + 1);
    expect(() => assertPayloadWithinSize(oversized)).toThrow(/too large/i);
  });
});
