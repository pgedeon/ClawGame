/**
 * Exported-HTML headless smoke e2e (retro-2 ruling #1 — last P0 item).
 *
 * Every prior phaser-html export claim rested on generated-code string
 * assertions; this spec is the first to EXECUTE a real export in a real
 * browser. Per shipped template (platformer, topdown, dialogue):
 *
 *   1. Create project via API (same endpoint the UI launch flow uses).
 *   2. Write the shipped template scene into scenes/main-scene.json.
 *   3. Call the phaser-html export endpoint, fetch the exported HTML.
 *   4. Write it to a temp dir, serve statically over localhost HTTP.
 *   5. Boot it in headless Chromium and assert:
 *        - Phaser boots: <canvas> present inside #game-container
 *        - scene class instantiates without thrown errors
 *          (a throw during construction/create surfaces as pageerror)
 *        - expected entity count compiled into the scene
 *          (one this.add.* call per entity — see note below)
 *        - zero page errors / console errors
 *
 * Hermeticity: the exported artifact references the official Phaser CDN URL;
 * we assert that URL is present verbatim, then intercept exactly that request
 * in Playwright and fulfill it with the workspace's own phaser@4.0.0 dist
 * bytes. The artifact stays byte-identical; boots stay deterministic offline.
 * (The CDN URL itself is asserted — a wrong/pinned-broken URL still fails.)
 *
 * No window hook was added to generated code (retro-2 ruling #1 guidance):
 * canvas presence + absence of error events is sufficient here, and the
 * entity-count assertion reads the generated source of the executed page.
 *
 * API target: E2E_API_URL (default http://localhost:3000 — matches the
 * playwright.config.ts webServer). Never derived from VITE_* env vars
 * (env-independence standing rule). Local dev run example:
 *   E2E_API_URL=http://localhost:3300 pnpm exec playwright test --config e2e/export-smoke.config.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { templateScenes } from '../apps/web/src/templates/templateScenes';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const STATIC_PORT = 8897;
const PHASER_CDN_URL = 'https://cdn.jsdelivr.net/npm/phaser@4.0.0/dist/phaser.min.js';
// Resolved relative to repo root (spec lives in e2e/).
const PHASER_DIST = join(__dirname, '..', 'node_modules', '.pnpm', 'phaser@4.0.0', 'node_modules', 'phaser', 'dist', 'phaser.min.js');

let server: Server;
let serveDir: string;

test.beforeAll(async () => {
  serveDir = await mkdtemp(join(tmpdir(), 'clawgame-export-smoke-'));
  const phaserBytes = await readFile(PHASER_DIST);

  server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    if (path === '/phaser.min.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end(phaserBytes);
      return;
    }
    const name = path.replace(/^\/+/, '');
    if (!/^[\w.-]+\.html$/.test(name)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    readFile(join(serveDir, name))
      .then((buf) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(buf);
      })
      .catch(() => {
        res.writeHead(404);
        res.end('not found');
      });
  });
  await new Promise<void>((resolve) => server.listen(STATIC_PORT, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

async function createProject(name: string): Promise<string> {
  const resp = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      genre: 'action',
      artStyle: 'pixel',
      description: 'export-smoke-e2e',
    }),
  });
  // WHATWG fetch Response: status/ok are properties, not methods.
  expect(resp.status).toBe(201);
  const body = await resp.json();
  expect(body.id).toBeTruthy();
  return body.id as string;
}

async function writeTemplateScene(projectId: string, scene: unknown): Promise<void> {
  const resp = await fetch(`${API_URL}/api/projects/${projectId}/files/scenes/main-scene.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: JSON.stringify(scene, null, 2) }),
  });
  expect(resp.ok).toBeTruthy();
}

interface ExportMeta {
  format: string;
  filename: string;
  downloadUrl: string;
}

async function exportPhaserHtml(projectId: string): Promise<{ meta: ExportMeta; html: string }> {
  const resp = await fetch(`${API_URL}/api/projects/${projectId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'phaser-html' }),
  });
  expect(resp.status).toBe(201);
  const meta = await resp.json();
  expect(meta.format).toBe('phaser-html');
  const htmlResp = await fetch(`${API_URL}${meta.downloadUrl}`);
  expect(htmlResp.ok).toBeTruthy();
  return { meta, html: await htmlResp.text() };
}

/** Fulfill the official CDN request with local dist bytes; everything else passes through. */
async function stubPhaserCdn(page: Page): Promise<void> {
  const phaserBytes = await readFile(PHASER_DIST);
  await page.route(PHASER_CDN_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: phaserBytes })
  );
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console-error: ${msg.text()}`);
  });
  return errors;
}

for (const [templateId, scene] of Object.entries(templateScenes)) {
  const expectedEntities = scene.entities.length;

  test(`exported ${templateId} template boots in headless Chromium (${expectedEntities} entities)`, async ({ page }) => {
    // 1–3. Project + template scene + phaser-html export via API
    const projectId = await createProject(`Export Smoke ${templateId}`);
    await writeTemplateScene(projectId, scene);
    const { html } = await exportPhaserHtml(projectId);

    // Artifact integrity: standalone HTML references the official Phaser CDN build.
    expect(html).toContain(PHASER_CDN_URL);

    // Entity count compiled into the generated scene: every template entity
    // must produce exactly one this.add.* call in the code the browser runs.
    const addCalls = (html.match(/this\.add\./g) || []).length;
    expect(addCalls).toBe(expectedEntities);

    // 4. Persist artifact to temp dir, serve statically.
    const fileName = `${templateId}.html`;
    await writeFile(join(serveDir, fileName), html, 'utf-8');

    // 5. Boot in headless Chromium with hermetic Phaser fulfillment.
    await stubPhaserCdn(page);
    const errors = collectErrors(page);
    await page.goto(`http://localhost:${STATIC_PORT}/${fileName}`, { waitUntil: 'load' });

    // Phaser boots: game canvas mounted into the container.
    const canvas = page.locator('#game-container canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Give the scene create()/first update ticks time to surface any
    // deferred runtime error before we assert error-freedom.
    await page.waitForTimeout(2500);

    // Scene class instantiated without thrown errors + zero console errors.
    expect(errors).toEqual([]);
  });
}
