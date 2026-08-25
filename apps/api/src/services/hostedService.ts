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
/**
 * Web origin the injected Remix CTA points at. The remix import flow itself
 * ships in slice 2 — until then the web app serves an honest placeholder page
 * at /remix/:hostedId (no dead links rule).
 */
export const SHARE_WEB_ORIGIN = process.env.SHARE_WEB_ORIGIN || 'http://localhost:5173';

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

    // Share payload sidecar (slice 1 stub per design §6): schema-1 record with
    // lineage + source-included flag. Slice 2 replaces the stub bodies with the
    // verbatim project/scene/scripts/assets payload for the remix import flow.
    await writeFile(
      join(hostedDir, `${hostedId}.share.json`),
      JSON.stringify(
        {
          schema: 1,
          originProjectId: projectId,
          originHostedId: hostedId,
          sharedAt: new Date().toISOString(),
          sourceIncluded: true,
        },
        null,
        2,
      ),
      'utf-8',
    );

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

    const remixHref = `${SHARE_WEB_ORIGIN}/remix/${metadata.hostedId}`;
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
    <div>
      <strong>🎮 ClawGame</strong>${expiresLine}
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <a href="${remixHref}" target="_blank" rel="noopener" id="clawgame-remix-link" style="color:#8b5cf6;font-weight:600;">🎮 Remix this game</a>
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
