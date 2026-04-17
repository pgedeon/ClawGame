/**
 * @clawgame/api - Hosted Service
 * Provides real web hosting for exported games, enabling true publishing capabilities.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';
import { ExportService } from './exportService';

export interface HostedExport {
  id: string;
  projectId: string;
  projectName: string;
  filename: string;
  hostedUrl: string;
  createdAt: string;
  expiresAt?: string;
  downloadUrl: string;
}

export interface HostedOptions {
  expiresInDays?: number; // How long before the hosted link expires
  public?: boolean; // Whether the game should be publicly accessible
}

/** Hosted exports directory and metadata */
const HOSTED_DIR = process.env.HOSTED_DIR || './data/hosted';

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
   * Build the public view URL for a hosted game.
   * Points to the /api/hosted/:id/view endpoint which serves the HTML.
   */
  private buildHostedUrl(hostedId: string): string {
    return `${HOSTED_BASE_URL}/api/hosted/${hostedId}/view`;
  }

  /**
   * Host an export for web viewing (not just download)
   */
  async hostExport(projectId: string, exportFilename: string, options: HostedOptions = {}): Promise<HostedExport> {
    const hostedDir = await this.ensureHostedDir();
    const expiresInDays = options.expiresInDays || 30; // Default 30 days
    const isPublic = options.public !== false;

    this.logger.info({ projectId, exportFilename, isPublic, expiresInDays }, 'Hosting export for web viewing');

    // Verify the export exists
    const exportFile = join('./data/exports', exportFilename);
    if (!existsSync(exportFile)) {
      throw new Error('Export not found');
    }

    // Generate hosted ID and URL
    const hostedId = this.generateHostedId();
    const hostedUrl = this.buildHostedUrl(hostedId);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

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
   * Generate a unique hosted ID
   */
  private generateHostedId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get project name for metadata
   */
  private async getProjectName(projectId: string): Promise<string> {
    try {
      const projectsDir = './data/projects';
      const projectPath = join(projectsDir, projectId, 'project.json');
      if (existsSync(projectPath)) {
        const projectData = JSON.parse(await readFile(projectPath, 'utf-8'));
        return projectData.name || 'Untitled Game';
      }
    } catch (err) {
      this.logger.warn({ projectId, err }, 'Failed to get project name');
    }
    return 'Untitled Game';
  }

  /**
   * Enhance HTML for hosting with metadata and branding
   */
  private enhanceForHosting(html: string, metadata: any): string {
    // Add hosted game metadata
    const hostedMeta = {
      projectId: metadata.projectId,
      hostedId: metadata.hostedId,
      hostedUrl: metadata.hostedUrl,
      expiresAt: metadata.expiresAt,
      isPublic: metadata.isPublic,
      hostedAt: new Date().toISOString(),
    };

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
      <strong>🎮 ClawGame</strong> •
      <a href="${metadata.hostedUrl}" target="_blank" style="color: #8b5cf6;">Open Fullscreen</a> •
      Expires: ${new Date(metadata.expiresAt).toLocaleDateString()}
    </div>
    <div>
      Made with <a href="https://clawgame.dev" target="_blank" style="color: #60a5fa;">ClawGame</a>
    </div>
  \`;

  document.body.insertBefore(nav, document.body.firstChild);

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

    const htmlExists = existsSync(hostedPath);
    const metaExists = existsSync(metaPath);

    if (!htmlExists && !metaExists) {
      return false;
    }

    if (htmlExists) await unlink(hostedPath);
    if (metaExists) await unlink(metaPath);

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

          if (existsSync(hostedPath)) await unlink(hostedPath);
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
