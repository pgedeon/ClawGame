/**
 * Route tests for GET /api/gallery (P3.1 community feed v1):
 *
 *   - empty state on a fresh HOSTED_DIR
 *   - listing over .share.json snapshots joined with .meta.json counters
 *   - sorted by sharedAt desc
 *   - expired shares excluded; non-expiring kept
 *   - legacy shares without a sidecar are not listed
 *
 * Fixtures are real: shares created through the actual POST /share route into
 * the tempdir HOSTED_DIR (src/test/setup.ts), then per-test artifact surgery
 * for deterministic ordering/expiry. No network, no mocks of code under test.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { hostedRoutes } from '../routes/hostedRoutes';
import { ProjectService } from '../services/projectService';

const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
const HOSTED_DIR = process.env.HOSTED_DIR as string;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(hostedRoutes);
  await app.ready();
  return app;
}

async function createAndShare(name: string) {
  const app = await buildApp();
  const projects = new ProjectService(mockLogger);
  const { id } = await projects.createProject({ name, genre: 'platformer', artStyle: 'pixel' });
  const res = await app.inject({ method: 'POST', url: `/api/projects/${id}/share` });
  expect(res.statusCode).toBe(201);
  const token = res.json().hosted.id as string;
  return { app, token };
}

async function getGallery(app: FastifyInstance) {
  const res = await app.inject({ method: 'GET', url: '/api/gallery' });
  expect(res.statusCode).toBe(200);
  return res.json().games as Array<{
    id: string;
    name: string;
    plays: number;
    remixes: number;
    sharedAt: string;
    url: string;
  }>;
}

/** Rewrite one share's snapshot timestamp + meta expiry for deterministic fixtures. */
async function redateShare(token: string, opts: { sharedAt?: string; expiresAt?: string | null }) {
  if (opts.sharedAt !== undefined) {
    const sharePath = join(HOSTED_DIR, `${token}.share.json`);
    const payload = JSON.parse(await readFile(sharePath, 'utf-8'));
    payload.sharedAt = opts.sharedAt;
    await writeFile(sharePath, JSON.stringify(payload, null, 2));
  }
  if (opts.expiresAt !== undefined) {
    const metaPath = join(HOSTED_DIR, `${token}.meta.json`);
    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    meta.expiresAt = opts.expiresAt;
    await writeFile(metaPath, JSON.stringify(meta, null, 2));
  }
}

/** Tests share one tempdir HOSTED_DIR — wipe artifacts between tests. */
beforeEach(async () => {
  const entries = await readdir(HOSTED_DIR).catch(() => [] as string[]);
  await Promise.all(entries.map((e) => rm(join(HOSTED_DIR, e), { recursive: true, force: true })));
});

describe('GET /api/gallery — community feed v1', () => {
  it('returns an empty list on a fresh hosted dir', async () => {
    const app = await buildApp();
    const games = await getGallery(app);
    expect(games).toEqual([]);
  });

  it('lists shared games with name, aggregate counts, sharedAt and playable URL', async () => {
    const { app, token } = await createAndShare('Gallery Fixture Alpha');
    // One play + one remix recorded through the real counter path.
    await app.inject({ method: 'GET', url: `/share/${token}` }); // serve → plays+1
    await app.inject({ method: 'GET', url: `/api/share/${token}/remix` }); // payload → remixes+1

    const games = await getGallery(app);
    expect(games).toHaveLength(1);
    const game = games[0];
    expect(game.id).toBe(token);
    expect(game.name).toBe('Gallery Fixture Alpha');
    expect(game.plays).toBe(1);
    expect(game.remixes).toBe(1);
    expect(typeof game.sharedAt).toBe('string');
    expect(game.url).toContain(`/share/${token}`);
  });

  it('sorts by sharedAt descending regardless of share order on disk', async () => {
    const a = await createAndShare('Gallery Order A');
    const b = await createAndShare('Gallery Order B');
    const c = await createAndShare('Gallery Order C');
    // Make on-disk share order oldest-first-newest-last but timestamps say C > A > B.
    await redateShare(a.token, { sharedAt: '2026-08-26T10:00:00.000Z' });
    await redateShare(b.token, { sharedAt: '2026-08-26T09:00:00.000Z' });
    await redateShare(c.token, { sharedAt: '2026-08-26T11:00:00.000Z' });
    void a.app;
    const app = c.app;

    const games = await getGallery(app);
    expect(games.map((g) => g.name)).toEqual(['Gallery Order C', 'Gallery Order A', 'Gallery Order B']);
  });

  it('excludes expired shares but keeps non-expiring ones', async () => {
    const live = await createAndShare('Gallery Live');
    const dead = await createAndShare('Gallery Expired');
    await redateShare(dead.token, { expiresAt: '2020-01-01T00:00:00.000Z' });
    void live.app;

    const games = await getGallery(live.app);
    expect(games.map((g) => g.name)).toEqual(['Gallery Live']);
    expect(games.some((g) => g.id === dead.token)).toBe(false);
  });

  it('does not list legacy shares without a .share.json sidecar', async () => {
    const { app, token } = await createAndShare('Gallery Legacy');
    // Strip the sidecar → pre-slice-2 share; still playable, not gallery-worthy.
    const { unlink } = await import('node:fs/promises');
    await unlink(join(HOSTED_DIR, `${token}.share.json`));

    const games = await getGallery(app);
    expect(games).toEqual([]);
  });
});
