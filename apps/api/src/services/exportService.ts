/**
 * @clawgame/api - Export Service
 * Packages game projects into standalone HTML exports with embedded assets
 */

import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';
import { ProjectService } from './projectService';
import { AssetService } from './assetService';

export interface ExportOptions {
  includeAssets?: boolean;
  minify?: boolean;
  compress?: boolean;
  format?: 'html' | 'zip';
}

export interface ExportResult {
  projectId: string;
  projectName: string;
  version: string;
  format: 'html' | 'zip';
  size: number;
  filename: string;
  downloadUrl: string;
  createdAt: string;
  includesAssets: boolean;
  assetCount: number;
}

/** Metadata stored alongside each export for reliable listing */
interface ExportMetadata {
  projectId: string;
  projectName: string;
  version: string;
  createdAt: string;
  includesAssets: boolean;
  assetCount: number;
}

const EXPORTS_DIR = process.env.EXPORTS_DIR || './data/exports';

export class ExportService {
  private logger: FastifyLoggerInstance;
  private projectService: ProjectService;
  private assetService: AssetService;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.projectService = new ProjectService(logger);
    this.assetService = new AssetService(logger);
  }

  /**
   * Ensure exports directory exists
   */
  private async ensureExportsDir(): Promise<string> {
    if (!existsSync(EXPORTS_DIR)) {
      await mkdir(EXPORTS_DIR, { recursive: true });
    }
    return EXPORTS_DIR;
  }

  /**
   * Generate standalone HTML export of a game
   */
  async exportToHTML(projectId: string, options: ExportOptions = {}): Promise<ExportResult> {
    const includeAssets = options.includeAssets !== false;
    const exportsDir = await this.ensureExportsDir();

    this.logger.info({ projectId, includeAssets }, 'Starting HTML export');

    // Load project data
    const project = await this.projectService.getProjectDetail(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Load scene data - use direct file reading for simplicity
    let sceneData: any = null;
    const scenePath = join('./data/projects', projectId, 'scenes/main-scene.json');
    try {
      if (existsSync(scenePath)) {
        const sceneContent = await readFile(scenePath, 'utf-8');
        sceneData = JSON.parse(sceneContent);
      }
    } catch (sceneErr) {
      this.logger.warn({ projectId, err: sceneErr }, 'No scene file found, using default scene');
      sceneData = { name: 'Main Scene', entities: [] };
    }

    if (!sceneData) {
      sceneData = { name: 'Main Scene', entities: [] };
    }

    // Load assets if requested
    let assetData: any[] = [];
    if (includeAssets) {
      assetData = await this.embedAssets(projectId);
    }

    // Generate HTML
    const html = this.generateGameHTML(project, sceneData, assetData, includeAssets);

    // Write export file — include projectId in filename for reliable listing
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = project.name.replace(/[^a-zA-Z0-9-]/g, '-');
    const filename = `${projectId}-${safeName}-${timestamp}.html`;
    const filePath = join(exportsDir, filename);

    await writeFile(filePath, html, 'utf-8');

    // Write metadata sidecar for accurate listing
    const metadata: ExportMetadata = {
      projectId,
      projectName: project.name,
      version: project.version || '1.0.0',
      createdAt: new Date().toISOString(),
      includesAssets: includeAssets,
      assetCount: assetData.length,
    };
    const metaPath = join(exportsDir, `${filename}.meta.json`);
    await writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    const result: ExportResult = {
      projectId,
      projectName: project.name,
      version: project.version || '1.0.0',
      format: 'html',
      size: Buffer.byteLength(html, 'utf-8'),
      filename,
      downloadUrl: `/api/projects/${projectId}/exports/${filename}`,
      createdAt: metadata.createdAt,
      includesAssets: includeAssets,
      assetCount: assetData.length,
    };

    this.logger.info({
      projectId,
      filename,
      size: result.size,
      assetCount: result.assetCount,
    }, 'HTML export completed');

    return result;
  }

  /**
   * Embed assets as data URIs in the export
   */
  private async embedAssets(projectId: string): Promise<any[]> {
    const assets = await this.assetService.listAssets(projectId);
    const embeddedAssets: any[] = [];

    for (const asset of assets) {
      try {
        const { content, mimeType } = await this.assetService.getAssetFile(projectId, asset.id);
        const base64 = content.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;

        embeddedAssets.push({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          dataUri,
          mimeType,
          tags: asset.tags || [],
        });
      } catch (err) {
        this.logger.warn({ projectId, assetId: asset.id, err }, 'Failed to embed asset');
      }
    }

    return embeddedAssets;
  }

  /**
   * Generate standalone HTML game file
   */
  private generateGameHTML(
    project: any,
    sceneData: any,
    assetData: any[],
    includeAssets: boolean
  ): string {
    const gameData = {
      project: {
        name: project.name,
        version: project.version || '1.0.0',
        genre: project.genre,
        artStyle: project.artStyle,
      },
      scene: sceneData,
      assets: includeAssets ? assetData : [],
      createdAt: new Date().toISOString(),
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${project.description || 'A game created with ClawGame'}">
    <title>${project.name} - ClawGame Export</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }
        #game-container {
            position: relative;
            width: 100%;
            max-width: 1200px;
            height: 80vh;
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        #game-canvas {
            width: 100%;
            height: 100%;
            display: block;
            image-rendering: crisp-edges;
        }
        #game-ui {
            position: absolute;
            top: 1rem;
            left: 1rem;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            font-family: monospace;
            font-size: 0.875rem;
            color: #f1f5f9;
        }
        #game-controls {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            font-family: monospace;
            font-size: 0.875rem;
            color: #f1f5f9;
        }
        .stat { display: flex; justify-content: space-between; margin-bottom: 0.25rem; min-width: 120px; }
        .stat-label { color: #94a3b8; margin-right: 0.5rem; }
        .stat-value { color: #8b5cf6; font-weight: 500; }
        #start-screen {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(15, 23, 42, 0.95);
            z-index: 100;
        }
        #start-screen h1 { font-size: 3rem; margin-bottom: 1rem; color: #8b5cf6; }
        #start-screen p { font-size: 1.25rem; margin-bottom: 2rem; }
        .clawgame-brand {
            position: absolute;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <div id="game-ui"></div>
        <div id="game-controls"></div>
        <div id="start-screen">
            <h1>${project.name}</h1>
            <p>Press any key to start</p>
        </div>
        <div class="clawgame-brand">Built with ClawGame</div>
    </div>

    <script>
        // Game Data
        const GAME_DATA = ${JSON.stringify(gameData, null, 2)};

        // Game Engine
        class GameEngine {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.running = false;
                this.entities = new Map();
                this.keys = {};
                this.lastTime = 0;
                this.frameCount = 0;
                this.assets = new Map();
            }

            init() {
                // Setup canvas
                this.resizeCanvas();
                window.addEventListener('resize', () => this.resizeCanvas());

                // Setup input
                window.addEventListener('keydown', (e) => {
                    this.keys[e.key.toLowerCase()] = true;
                    if (!this.running && document.getElementById('start-screen')) {
                        this.start();
                    }
                });
                window.addEventListener('keyup', (e) => {
                    this.keys[e.key.toLowerCase()] = false;
                });

                // Load assets
                this.loadAssets();

                // Setup entities from scene
                this.setupEntities();
            }

            resizeCanvas() {
                const container = this.canvas.parentElement;
                this.canvas.width = container.clientWidth;
                this.canvas.height = container.clientHeight;
            }

            loadAssets() {
                GAME_DATA.assets.forEach(asset => {
                    this.assets.set(asset.id, {
                        ...asset,
                        image: new Image(),
                        loaded: false
                    });
                    const img = this.assets.get(asset.id).image;
                    img.onload = () => {
                        this.assets.get(asset.id).loaded = true;
                    };
                    img.src = asset.dataUri;
                });
            }

            setupEntities() {
                GAME_DATA.scene.entities.forEach(e => {
                    const entity = {
                        ...e,
                        vx: 0,
                        vy: 0,
                        color: this.getEntityColor(e),
                    };
                    this.entities.set(e.id, entity);
                });
            }

            getEntityColor(entity) {
                const sprite = entity.components?.sprite;
                if (sprite?.color) return sprite.color;
                if (entity.components?.playerInput) return '#3b82f6';
                if (entity.components?.ai) return '#ef4444';
                if (entity.components?.collision?.type === 'collectible') return '#fbbf24';
                return '#8b5cf6';
            }

            start() {
                const startScreen = document.getElementById('start-screen');
                if (startScreen) {
                    startScreen.style.display = 'none';
                }
                this.running = true;
                this.lastTime = performance.now();
                this.gameLoop();
            }

            update(deltaTime) {
                this.entities.forEach((entity, id) => {
                    // Player input
                    if (entity.components?.playerInput) {
                        const speed = entity.components.movement?.speed || 200;
                        entity.vx = 0;
                        entity.vy = 0;

                        if (this.keys['arrowleft'] || this.keys['a']) entity.vx = -speed;
                        if (this.keys['arrowright'] || this.keys['d']) entity.vx = speed;
                        if (this.keys['arrowup'] || this.keys['w']) entity.vy = -speed;
                        if (this.keys['arrowdown'] || this.keys['s']) entity.vy = speed;

                        entity.transform.x += entity.vx * (deltaTime / 1000);
                        entity.transform.y += entity.vy * (deltaTime / 1000);

                        // Keep in bounds
                        const margin = (entity.components.sprite?.width || 32) / 2;
                        entity.transform.x = Math.max(margin, Math.min(this.canvas.width - margin, entity.transform.x));
                        entity.transform.y = Math.max(margin, Math.min(this.canvas.height - margin, entity.transform.y));
                    }

                    // AI patrol
                    if (entity.components?.ai?.type === 'patrol') {
                        const time = performance.now() / 1000;
                        const speed = entity.components.ai.patrolSpeed || 50;
                        entity.transform.x = 400 + Math.sin(time * speed / 100) * 200;
                        entity.transform.y = 300 + Math.cos(time * speed / 100) * 100;
                    }

                    // Coin animation
                    if (entity.components?.collision?.type === 'collectible') {
                        entity.transform.rotation += deltaTime * 0.002;
                    }
                });

                // Collision detection
                const player = this.entities.get('player-1');
                if (player) {
                    this.entities.forEach((entity, id) => {
                        if (entity.components?.collision?.type === 'collectible') {
                            const dx = player.transform.x - entity.transform.x;
                            const dy = player.transform.y - entity.transform.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const playerWidth = player.components.sprite?.width || 32;
                            const coinWidth = entity.components.sprite?.width || 16;

                            if (distance < (playerWidth + coinWidth) / 2) {
                                this.entities.delete(id);
                            }
                        }
                    });
                }
            }

            render() {
                // Clear canvas
                this.ctx.fillStyle = '#0f172a';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // Draw grid
                this.ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
                this.ctx.lineWidth = 1;
                const gridSize = 32;

                for (let x = 0; x < this.canvas.width; x += gridSize) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, 0);
                    this.ctx.lineTo(x, this.canvas.height);
                    this.ctx.stroke();
                }

                for (let y = 0; y < this.canvas.height; y += gridSize) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, y);
                    this.ctx.lineTo(this.canvas.width, y);
                    this.ctx.stroke();
                }

                // Draw entities
                this.entities.forEach((entity, id) => {
                    const { x, y, scaleX, scaleY, rotation } = entity.transform;
                    const width = entity.components.sprite?.width || 32;
                    const height = entity.components.sprite?.height || 32;

                    // Check if we have a sprite image
                    const spriteRef = entity.components.sprite?.image;
                    if (spriteRef && this.assets.has(spriteRef)) {
                        const asset = this.assets.get(spriteRef);
                        if (asset && asset.loaded) {
                            this.ctx.save();
                            this.ctx.translate(x, y);
                            this.ctx.rotate(rotation || 0);
                            this.ctx.scale(scaleX || 1, scaleY || 1);
                            this.ctx.drawImage(asset.image, -width/2, -height/2, width, height);
                            this.ctx.restore();
                            return;
                        }
                    }

                    // Fallback to colored rectangle
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    this.ctx.rotate(rotation || 0);
                    this.ctx.scale(scaleX || 1, scaleY || 1);

                    this.ctx.fillStyle = entity.color;
                    this.ctx.fillRect(-width/2, -height/2, width, height);

                    if (entity.components?.playerInput) {
                        this.ctx.strokeStyle = '#60a5fa';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(-width/2, -height/2, width, height);
                    }

                    this.ctx.restore();
                });

                // Draw UI
                this.renderUI();
            }

            renderUI() {
                const ui = document.getElementById('game-ui');
                const controls = document.getElementById('game-controls');
                
                if (ui && this.frameCount % 30 === 0) {
                    const fps = Math.round(1000 / (this.lastTime || 16));
                    ui.innerHTML = \`
                        <div class="stat">
                            <span class="stat-label">FPS:</span>
                            <span class="stat-value">\${fps}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Entities:</span>
                            <span class="stat-value">\${this.entities.size}</span>
                        </div>
                    \`;
                }

                if (controls && !controls.hasChildNodes()) {
                    controls.innerHTML = \`
                        <div>Controls:</div>
                        <div>WASD / Arrows: Move</div>
                        <div>Scene: \${GAME_DATA.scene.name}</div>
                    \`;
                }
            }

            gameLoop() {
                if (!this.running) return;

                const currentTime = performance.now();
                const deltaTime = currentTime - this.lastTime;
                this.lastTime = currentTime;

                this.update(deltaTime);
                this.render();

                this.frameCount++;
                requestAnimationFrame(() => this.gameLoop());
            }
        }

        // Initialize game
        window.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('game-canvas');
            const engine = new GameEngine(canvas);
            engine.init();
        });
    </script>
</body>
</html>`;
  }

  /**
   * Get export file
   */
  async getExportFile(filename: string): Promise<{ content: Buffer; mimeType: string }> {
    const filePath = join(EXPORTS_DIR, filename);

    if (!existsSync(filePath)) {
      throw new Error('Export not found');
    }

    const content = await readFile(filePath);
    return {
      content: Buffer.from(content),
      mimeType: 'text/html',
    };
  }

  /**
   * List exports for a project using metadata sidecar files
   */
  async listExports(projectId: string): Promise<ExportResult[]> {
    const exportsDir = await this.ensureExportsDir();
    const files = await readdir(exportsDir);

    const results: ExportResult[] = [];

    for (const file of files) {
      // Only process metadata sidecars for this project
      if (!file.endsWith('.meta.json')) continue;

      // Read metadata to check projectId
      const metaPath = join(exportsDir, file);
      try {
        const metaContent = await readFile(metaPath, 'utf-8');
        const meta: ExportMetadata = JSON.parse(metaContent);

        if (meta.projectId !== projectId) continue;

        // The HTML file is the meta filename without the .meta.json suffix
        const htmlFilename = file.replace(/\.meta\.json$/, '');
        const htmlPath = join(exportsDir, htmlFilename);

        if (!existsSync(htmlPath)) continue;

        const stats = await stat(htmlPath);

        results.push({
          projectId: meta.projectId,
          projectName: meta.projectName,
          version: meta.version,
          format: 'html',
          size: stats.size,
          filename: htmlFilename,
          downloadUrl: `/api/projects/${projectId}/exports/${htmlFilename}`,
          createdAt: meta.createdAt,
          includesAssets: meta.includesAssets,
          assetCount: meta.assetCount,
        });
      } catch (err) {
        this.logger.warn({ file, err }, 'Failed to read export metadata');
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  /**
   * Delete export file and its metadata sidecar
   */
  async deleteExport(filename: string): Promise<boolean> {
    const filePath = join(EXPORTS_DIR, filename);
    const metaPath = join(EXPORTS_DIR, `${filename}.meta.json`);

    const htmlExists = existsSync(filePath);
    const metaExists = existsSync(metaPath);

    if (!htmlExists && !metaExists) {
      return false;
    }

    if (htmlExists) await unlink(filePath);
    if (metaExists) await unlink(metaPath);

    this.logger.info({ filename }, 'Export deleted');

    return true;
  }
}
