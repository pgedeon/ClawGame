/**
 * @clawgame/api - Hosted Service
 * Provides real web hosting for exported games, enabling true publishing capabilities.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { FastifyLoggerInstance } from 'fastify';
import { ExportService } from './exportService';

export interface HostedExport {
  id: string;
  projectId: string;
  projectName: string;
  filename: string;
  hostedUrl: string;
  createdAt: string;
  /** ISO timestamp when the link dies — absent/null for non-expiring shares. */
  expiresAt?: string | null;
  downloadUrl: string;
  /** v1 ruling (CEO 2026-08-25): shares include full editable source by default. */
  sourceIncluded?: boolean;
  /** Aggregate play/remix counters (slice 3). Integers only — zero PII by design. */
  counts?: { plays: number; remixes: number };
}

export interface HostedOptions {
  /**
   * How long before the hosted link expires.
   * `undefined` → legacy default of 30 days (ExportPage power path).
   * `null` or `0` → never expires (one-click share path; manual delete only).
   */
  expiresInDays?: number | null;
  public?: boolean; // Whether the game should be publicly accessible
}

/** Hosted exports directory and metadata */
const HOSTED_DIR = process.env.HOSTED_DIR || './data/hosted';
/** Exports dir (env-aware so tests can redirect; runtime default unchanged). */
const EXPORTS_DIR = process.env.EXPORTS_DIR || './data/exports';
/** Projects dir (env-aware so tests can redirect; runtime default unchanged). */
const PROJECTS_DIR = process.env.PROJECTS_DIR || './data/projects';
/** Assets dir (env-aware so tests can redirect; runtime default unchanged). */
const ASSETS_DIR = process.env.ASSETS_DIR || './data/assets';
/** Web origin the injected Remix CTA points at (slice-2 import flow lives there). */
export const SHARE_WEB_ORIGIN = process.env.SHARE_WEB_ORIGIN || 'http://localhost:5173';

/** Serialized remix payload cap (design §4): host-time rejection, no partial artifacts. */
export const SHARE_PAYLOAD_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Public gallery-listing projection (P3.1 feed v1): one shared game as the
 * community feed shows it. Aggregate integers only — zero PII by design,
 * same rule as the slice-3 counters.
 */
export interface GalleryEntry {
  /** Capability token — the `/share/:token` path segment. */
  id: string;
  /** Project name at share time (from the snapshot payload). */
  name: string;
  plays: number;
  remixes: number;
  /** ISO-8601 share timestamp from the snapshot payload. */
  sharedAt: string;
  /** Absolute playable URL (`HOSTED_BASE_URL/share/:token`). */
  url: string;
}

/** Minimal mime inference for asset refs (same intent as assetService.getMimeType). */
function inferMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  const table: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', mp3: 'audio/mpeg', wav: 'audio/wav',
    ogg: 'audio/ogg', json: 'application/json', txt: 'text/plain',
  };
  return table[ext] || 'application/octet-stream';
}

/** Pure size guard so the cap is unit-testable without multi-MB fixtures. */
export function assertPayloadWithinSize(json: string): void {
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > SHARE_PAYLOAD_MAX_BYTES) {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Share payload too large (${mb} MB) — the limit is ${SHARE_PAYLOAD_MAX_BYTES / (1024 * 1024)} MB. Remove large assets and share again.`,
    );
  }
}

/** Lightweight asset reference — deliberately NO dataUri to keep payloads small. */
export interface RemixAssetRef {
  id: string;
  name: string;
  mimeType: string;
}

/**
 * `.share.json` sidecar payload (schema 1, slice 2 real impl).
 *
 * Carries everything a recipient client needs to fork an editable copy via the
 * existing project-create path: verbatim scene JSON + project metadata. Assets
 * are referenced by id/name only (template projects have zero assets; embedded
 * data URIs would blow past chat-app URL/link budgets for no v1 benefit).
 */
export interface ShareRemixPayload {
  schema: 1;
  originProjectId: string;
  originHostedId: string;
  sharedAt: string;
  sourceIncluded: boolean;
  project: {
    name: string;
    genre: string;
    artStyle: string;
    description?: string;
    settings?: { width: number; height: number; backgroundColor: string; gravity: { x: number; y: number } };
  };
  /** Verbatim scenes/main-scene.json content at share time. */
  scene: Record<string, unknown>;
  /** Referenced-only asset list ([] for template projects). */
  assets: RemixAssetRef[];
}

/**
 * Base URL for hosted game links.
 *
 * In production set HOSTED_BASE_URL to the public origin
 * (e.g. https://clawgame.example.com).
 *
 * In development the default is http://localhost:3000 so that hosted
 * game links resolve to the local API server's /api/hosted/:id/view endpoint.
 */
const HOSTED_BASE_URL = process.env.HOSTED_BASE_URL || 'http://localhost:3000';

export class HostedService {
  private logger: FastifyLoggerInstance;
  private exportService: ExportService;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.exportService = new ExportService(logger);
  }

  /**
   * Ensure hosted directory exists
   */
  private async ensureHostedDir(): Promise<string> {
    if (!existsSync(HOSTED_DIR)) {
      await mkdir(HOSTED_DIR, { recursive: true });
    }
    return HOSTED_DIR;
  }

  /**
   * Build the public share URL for a hosted game.
   *
   * Capability-token format (CEO ruling 3): short opaque token in the path,
   * served by GET /share/:token on this API origin. The legacy
   * /api/hosted/:id/view route keeps serving the same artifact.
   */
  private buildHostedUrl(hostedId: string): string {
    return `${HOSTED_BASE_URL}/share/${hostedId}`;
  }

  /**
   * Host an export for web viewing (not just download)
   */
  async hostExport(projectId: string, exportFilename: string, options: HostedOptions = {}): Promise<HostedExport> {
    const hostedDir = await this.ensureHostedDir();
    // undefined → legacy 30-day default (ExportPage power path);
    // null/0 → never expires (share path). Falsy-|| would have collapsed both.
    const neverExpires = options.expiresInDays === null || options.expiresInDays === 0;
    const expiresInDays = neverExpires ? null : (options.expiresInDays ?? 30);
    const isPublic = options.public !== false;

    this.logger.info({ projectId, exportFilename, isPublic, expiresInDays }, 'Hosting export for web viewing');

    // Verify the export exists
    const exportFile = join(EXPORTS_DIR, exportFilename);
    if (!existsSync(exportFile)) {
      throw new Error('Export not found');
    }

    // Generate hosted ID and URL
    const hostedId = this.generateHostedId();
    const hostedUrl = this.buildHostedUrl(hostedId);
    const expiresAt = expiresInDays === null
      ? null
      : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    // Build the REAL remix payload FIRST (slice 2): a >cap payload must reject
    // the host before any artifact is written (design AC: no partial artifacts).
    const sharePayload = await this.buildRemixPayload(projectId, hostedId);
    const shareJson = JSON.stringify(sharePayload, null, 2);
    assertPayloadWithinSize(shareJson);

    // Copy export to hosted directory
    const hostedFilename = `${hostedId}.html`;
    const hostedPath = join(hostedDir, hostedFilename);
    const exportContent = await readFile(exportFile, 'utf-8');

    // Add hosted-specific metadata to the HTML
    const enhancedContent = this.enhanceForHosting(exportContent, {
      projectId,
      hostedId,
      hostedUrl,
      expiresAt,
      isPublic,
    });

    await writeFile(hostedPath, enhancedContent, 'utf-8');

    // Share payload sidecar — the real remix payload built above.
    await writeFile(join(hostedDir, `${hostedId}.share.json`), shareJson, 'utf-8');

    // Create hosted metadata
    const hostedExport: HostedExport = {
      id: hostedId,
      projectId,
      projectName: await this.getProjectName(projectId),
      filename: exportFilename,
      hostedUrl,
      createdAt: new Date().toISOString(),
      expiresAt,
      downloadUrl: `/api/projects/${projectId}/exports/${exportFilename}`,
      sourceIncluded: true,
      counts: { plays: 0, remixes: 0 },
    };

    // Save hosted metadata
    const metaPath = join(hostedDir, `${hostedId}.meta.json`);
    await writeFile(metaPath, JSON.stringify(hostedExport, null, 2), 'utf-8');

    this.logger.info({
      hostedId,
      hostedUrl,
      projectId,
      expiresAt,
    }, 'Export successfully hosted for web viewing');

    return hostedExport;
  }

  /**
   * Build the remix payload written into `.share.json` (design §4).
   *
   * Sources mirror what exportToPhaserHTML reads: clawgame.project.json for
   * metadata/settings, scenes/main-scene.json verbatim for the scene. Assets
   * are listed as references only (id/name/mime) — never base64-embedded — so
   * typical template shares stay well under the 25 MB cap.
   */
  private async buildRemixPayload(projectId: string, hostedId: string): Promise<ShareRemixPayload> {
    // Project metadata + settings (legacy project.json fallback, same as getProjectName).
    let meta: any = {};
    const projectDir = join(PROJECTS_DIR, projectId);
    for (const name of ['clawgame.project.json', 'project.json']) {
      const projectPath = join(projectDir, name);
      if (existsSync(projectPath)) {
        try {
          meta = JSON.parse(await readFile(projectPath, 'utf-8'));
        } catch (err) {
          this.logger.warn({ projectId, err }, 'Failed to parse project file for share payload');
        }
        break;
      }
    }

    // Scene JSON verbatim (missing/unparsable → same default the exporter uses).
    let scene: Record<string, unknown> = { name: 'Main Scene', entities: [] };
    const scenePath = join(projectDir, 'scenes', 'main-scene.json');
    if (existsSync(scenePath)) {
      try {
        scene = JSON.parse(await readFile(scenePath, 'utf-8'));
      } catch (err) {
        this.logger.warn({ projectId, err }, 'Failed to parse scene for share payload; using default');
      }
    }

    // Asset references only — no data URIs (payload-size rule, design §7 risk 4).
    // Dirs and *.json (metadata sidecars / project file) are never assets.
    const assets: RemixAssetRef[] = [];
    try {
      const assetsDir = join(ASSETS_DIR, projectId);
      if (existsSync(assetsDir)) {
        for (const entry of await readdir(assetsDir, { withFileTypes: true })) {
          if (entry.isDirectory()) continue;
          if (entry.name.endsWith('.json')) continue;
          assets.push({ id: entry.name, name: entry.name, mimeType: inferMimeType(entry.name) });
        }
      }
    } catch (err) {
      this.logger.warn({ projectId, err }, 'Failed to list assets for share payload; continuing without refs');
    }

    return {
      schema: 1,
      originProjectId: projectId,
      originHostedId: hostedId,
      sharedAt: new Date().toISOString(),
      sourceIncluded: true,
      project: {
        name: meta?.project?.name || meta?.name || 'Untitled Game',
        genre: meta?.project?.genre || 'action',
        artStyle: meta?.project?.artStyle || 'pixel',
        description: meta?.project?.description || '',
        settings: meta?.settings,
      },
      scene,
      assets,
    };
  }

  /**
   * Read the remix payload sidecar for a hosted token.
   * Returns null when absent (legacy share without payload) or unparsable.
   */
  async getRemixPayload(hostedId: string): Promise<ShareRemixPayload | null> {
    const hostedDir = await this.ensureHostedDir();
    const sharePath = join(hostedDir, `${hostedId}.share.json`);
    if (!existsSync(sharePath)) return null;
    try {
      return JSON.parse(await readFile(sharePath, 'utf-8')) as ShareRemixPayload;
    } catch (err) {
      this.logger.warn({ hostedId, err }, 'Failed to read share remix payload');
      return null;
    }
  }

  /**
   * Generate a unique hosted ID.
   *
   * Capability URLs must be unguessable (design §3.4): the old
   * `game_<Date.now()>_<random>` form was time-structured and weakly random.
   * crypto.randomUUID() is the node ≥20 baseline. Old ids keep resolving —
   * lookup is filename-based, not prefix-parsed.
   */
  private generateHostedId(): string {
    return randomUUID();
  }

  /**
   * Get project name for metadata
   */
  private async getProjectName(projectId: string): Promise<string> {
    try {
      const projectDir = join(PROJECTS_DIR, projectId);
      // projectService writes clawgame.project.json; legacy installs used project.json.
      for (const name of ['clawgame.project.json', 'project.json']) {
        const projectPath = join(projectDir, name);
        if (existsSync(projectPath)) {
          const projectData = JSON.parse(await readFile(projectPath, 'utf-8'));
          return projectData?.project?.name || projectData?.name || 'Untitled Game';
        }
      }
    } catch (err) {
      this.logger.warn({ projectId, err }, 'Failed to get project name');
    }
    return 'Untitled Game';
  }

  /**
   * Enhance HTML for hosting with metadata and branding.
   *
   * Slice-1 rules (design §3.4 + CEO rulings):
   * - no dead links: "Made with ClawGame" is plain text until a real domain exists;
   * - Remix CTA points at SHARE_WEB_ORIGIN/remix/:id (placeholder page until slice 2);
   * - expiry line only when the entry actually expires (non-expiring shares must
   *   not print "Expires: Invalid Date");
   * - bar is dismissible session-only and never blocks play.
   */
  private enhanceForHosting(html: string, metadata: any): string {
    // Add hosted game metadata
    const hostedMeta = {
      projectId: metadata.projectId,
      hostedId: metadata.hostedId,
      hostedUrl: metadata.hostedUrl,
      expiresAt: metadata.expiresAt ?? null,
      isPublic: metadata.isPublic,
      sourceIncluded: metadata.sourceIncluded !== false,
      hostedAt: new Date().toISOString(),
    };

    // Remix CTA: SAME-TAB deep-link into the web app's import flow.
    // Deliberately NOT target=_blank: aux contexts inherit the opener's CSP
    // sandbox flags, so a popup would carry our no-allow-same-origin sandbox
    // onto the web origin — opaque origin, every vite module script
    // CORS-blocked, blank page (found in slice-2 browser verify).
    // Self-navigation is always permitted from a sandboxed top-level page.
    const remixHref = `${SHARE_WEB_ORIGIN}/remix/${metadata.hostedId}`;
    const remixLink = `<a href="${remixHref}" id="clawgame-remix-link" style="color:#8b5cf6;font-weight:600;">🎮 Remix this game</a>`;
    const expiresLine = metadata.expiresAt
      ? ` • <span id="clawgame-expires">Expires: ${new Date(metadata.expiresAt).toLocaleDateString()}</span>`
      : '';

    // Inject metadata script and hosted branding
    const injectedHtml = html.replace(
      '</body>',
      `
<script>
// Hosted Game Metadata
window.GAME_HOSTED_METADATA = ${JSON.stringify(hostedMeta)};

// Hosted Game Navigation
window.addEventListener('DOMContentLoaded', () => {
  // Add hosted navigation bar
  const nav = document.createElement('div');
  nav.id = 'clawgame-hosted-bar';
  nav.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 8px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  \`;

  nav.innerHTML = \`
    <div id="clawgame-bar-left">
      <strong>🎮 ClawGame</strong>${expiresLine}
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      ${remixLink}
      <span>Made with ClawGame</span>
      <button id="clawgame-dismiss-bar" type="button" title="Hide bar (this session only)" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:14px;padding:0 2px;">✕</button>
    </div>
  \`;

  document.body.insertBefore(nav, document.body.firstChild);

  // Session-only dismiss — never blocks play, no persistence by design.
  const dismiss = document.getElementById('clawgame-dismiss-bar');
  if (dismiss) {
    dismiss.addEventListener('click', () => nav.remove());
  }

  // Play count (slice 3): subtle aggregate integer from the share-stats
  // endpoint — rendered only after it arrives, so a slow/failed fetch never
  // delays or breaks the game. The CSP sandbox gives this page an opaque
  // origin, making the fetch cross-origin; /api/share/:token/stats answers
  // with ACAO:*. Failure is silent by design.
  try {
    var meta = window.GAME_HOSTED_METADATA || {};
    if (meta.hostedId) {
      fetch('/api/share/' + encodeURIComponent(meta.hostedId) + '/stats')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (s) {
          if (!s || typeof s.plays !== 'number' || s.plays < 1) return;
          var left = document.getElementById('clawgame-bar-left');
          if (!left || document.getElementById('clawgame-play-count')) return;
          var span = document.createElement('span');
          span.id = 'clawgame-play-count';
          span.style.cssText = 'opacity:0.65;margin-left:8px;';
          span.textContent = 'Played ' + s.plays + (s.plays === 1 ? ' time' : ' times');
          left.appendChild(span);
        })
        .catch(function () {});
    }
  } catch (e) { /* counters must never break play */ }

  // Adjust game container for nav bar
  const container = document.getElementById('game-container');
  if (container) {
    container.style.marginTop = '40px';
  }
});
</script>
</body>`
    );

    return injectedHtml;
  }

  /**
   * Read the aggregate share counters for a token.
   * Returns null when the token is unknown; zeros for legacy metas written
   * before counters existed. Integers only — no PII is ever recorded here.
   */
  async getShareStats(hostedId: string): Promise<{ plays: number; remixes: number } | null> {
    const hosted = await this.getHostedExport(hostedId);
    if (!hosted) return null;
    return {
      plays: Math.max(0, Math.trunc(hosted.counts?.plays ?? 0)),
      remixes: Math.max(0, Math.trunc(hosted.counts?.remixes ?? 0)),
    };
  }

  /**
   * Increment one aggregate counter in `<id>.meta.json` (read-modify-write).
   *
   * CEO ruling #4 exception to the storage-only funnel: these are bare
   * integers on an already-public artifact's meta file — no IPs, no user
   * agents, no fingerprints, nothing per-visitor. Never throws: a failed
   * counter write must not break serving or remixing (callers rely on it).
   */
  async incrementShareCount(hostedId: string, key: 'plays' | 'remixes'): Promise<void> {
    try {
      const hostedDir = await this.ensureHostedDir();
      const metaPath = join(hostedDir, `${hostedId}.meta.json`);
      if (!existsSync(metaPath)) return;
      const meta = JSON.parse(await readFile(metaPath, 'utf-8')) as HostedExport;
      const counts = {
        plays: Math.max(0, Math.trunc(meta.counts?.plays ?? 0)),
        remixes: Math.max(0, Math.trunc(meta.counts?.remixes ?? 0)),
      };
      counts[key] += 1;
      meta.counts = counts;
      await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch (err) {
      this.logger.warn({ hostedId, key, err }, 'Failed to increment share counter');
    }
  }

  /**
   * Get hosted export by ID
   */
  async getHostedExport(hostedId: string): Promise<HostedExport | null> {
    const hostedDir = await this.ensureHostedDir();
    const metaPath = join(hostedDir, `${hostedId}.meta.json`);

    if (!existsSync(metaPath)) {
      return null;
    }

    try {
      const metaContent = await readFile(metaPath, 'utf-8');
      return JSON.parse(metaContent);
    } catch (err) {
      this.logger.warn({ hostedId, err }, 'Failed to read hosted export metadata');
      return null;
    }
  }

  /**
   * Get hosted file content for serving
   */
  async getHostedFile(hostedId: string): Promise<{ content: Buffer; mimeType: string }> {
    const hostedDir = await this.ensureHostedDir();
    const filePath = join(hostedDir, `${hostedId}.html`);

    if (!existsSync(filePath)) {
      throw new Error('Hosted export not found');
    }

    const content = await readFile(filePath);
    return {
      content: Buffer.from(content),
      mimeType: 'text/html',
    };
  }

  /**
   * List hosted exports for a project
   */
  async listHostedExports(projectId: string): Promise<HostedExport[]> {
    const hostedDir = await this.ensureHostedDir();
    const files = await readdir(hostedDir);

    const results: HostedExport[] = [];

    for (const file of files) {
      // Only process metadata files
      if (!file.endsWith('.meta.json')) continue;

      try {
        const metaPath = join(hostedDir, file);
        const metaContent = await readFile(metaPath, 'utf-8');
        const hostedExport: HostedExport = JSON.parse(metaContent);

        if (hostedExport.projectId === projectId) {
          results.push(hostedExport);
        }
      } catch (err) {
        this.logger.warn({ file, err }, 'Failed to read hosted export metadata');
      }
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  /**
   * Community gallery listing (P3.1 feed v1).
   *
   * Enumerates `.share.json` sidecars in HOSTED_DIR (the share-snapshot
   * source of truth per design §4/§5) and joins each with its `.meta.json`
   * for aggregate counters and expiry. A game is listed only when it is
   * actually playable right now:
   * - sidecar present and parsable (legacy shares without one are not listed);
   * - meta present (orphan sidecar → skip) AND the hosted html still on disk;
   * - not expired (expired shares are excluded — same rule as serving).
   *
   * Public projection only: name, aggregate integers, sharedAt, token URL.
   * Sorted by sharedAt desc (newest shares first).
   */
  async listGallery(): Promise<GalleryEntry[]> {
    const hostedDir = await this.ensureHostedDir();
    let files: string[];
    try {
      files = await readdir(hostedDir);
    } catch {
      return [];
    }

    const entries: GalleryEntry[] = [];
    for (const file of files) {
      if (!file.endsWith('.share.json')) continue;
      const hostedId = file.slice(0, -'.share.json'.length);
      try {
        const payload = JSON.parse(await readFile(join(hostedDir, file), 'utf-8')) as ShareRemixPayload;
        if (!payload || typeof payload.sharedAt !== 'string') continue;

        const meta = await this.getHostedExport(hostedId);
        if (!meta) continue; // orphan sidecar — nothing playable behind it
        if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) continue;
        if (!existsSync(join(hostedDir, `${hostedId}.html`))) continue;

        entries.push({
          id: hostedId,
          name: payload.project?.name || meta.projectName || 'Untitled Game',
          plays: Math.max(0, Math.trunc(meta.counts?.plays ?? 0)),
          remixes: Math.max(0, Math.trunc(meta.counts?.remixes ?? 0)),
          sharedAt: payload.sharedAt,
          url: this.buildHostedUrl(hostedId),
        });
      } catch (err) {
        this.logger.warn({ file, err }, 'Failed to read share payload for gallery; skipping');
      }
    }

    entries.sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime());
    return entries;
  }

  /**
   * Delete hosted export
   */
  async deleteHostedExport(hostedId: string): Promise<boolean> {
    const hostedDir = await this.ensureHostedDir();
    const hostedPath = join(hostedDir, `${hostedId}.html`);
    const metaPath = join(hostedDir, `${hostedId}.meta.json`);
    const sharePath = join(hostedDir, `${hostedId}.share.json`);

    const htmlExists = existsSync(hostedPath);
    const metaExists = existsSync(metaPath);
    const shareExists = existsSync(sharePath);

    if (!htmlExists && !metaExists && !shareExists) {
      return false;
    }

    if (htmlExists) await unlink(hostedPath);
    if (metaExists) await unlink(metaPath);
    if (shareExists) await unlink(sharePath);

    this.logger.info({ hostedId }, 'Hosted export deleted');

    return true;
  }

  /**
   * Clean up expired hosted exports
   */
  async cleanupExpired(): Promise<number> {
    const hostedDir = await this.ensureHostedDir();
    const files = await readdir(hostedDir);
    let cleanedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.meta.json')) continue;

      try {
        const metaPath = join(hostedDir, file);
        const metaContent = await readFile(metaPath, 'utf-8');
        const hostedExport: HostedExport = JSON.parse(metaContent);

        // Check if expired
        if (hostedExport.expiresAt && new Date(hostedExport.expiresAt) < new Date()) {
          const hostedId = hostedExport.id;
          const hostedPath = join(hostedDir, `${hostedId}.html`);
          const sharePath = join(hostedDir, `${hostedId}.share.json`);

          if (existsSync(hostedPath)) await unlink(hostedPath);
          if (existsSync(sharePath)) await unlink(sharePath);
          if (existsSync(metaPath)) await unlink(metaPath);

          cleanedCount++;
          this.logger.info({ hostedId, expiresAt: hostedExport.expiresAt }, 'Cleaned up expired hosted export');
        }
      } catch (err) {
        this.logger.warn({ file, err }, 'Failed to process hosted export during cleanup');
      }
    }

    this.logger.info({ cleanedCount }, 'Cleanup completed');
    return cleanedCount;
  }
}
