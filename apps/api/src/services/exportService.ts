/**
 * @clawgame/api - Export Service
 * Packages game projects into standalone HTML exports with embedded assets.
 *
 * The export runtime uses the same simulation rules as the web preview
 * (useGamePreview), ensuring "Export runtime = preview runtime" (M12).
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
   * Generate standalone HTML game file.
   *
   * The inline runtime mirrors the web preview (useGamePreview) so that
   * exported games behave identically to what the creator sees in the
   * editor preview — the core M12 "export runtime = preview runtime" goal.
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
        #start-screen {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(15, 23, 42, 0.95);
            z-index: 100;
        }
        #start-screen h1 { font-size: 3rem; margin-bottom: 1rem; color: #8b5cf6; }
        #start-screen p { font-size: 1.25rem; margin-bottom: 2rem; color: #94a3b8; }
        #game-over-screen, #victory-screen {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }
        #game-over-screen { background: rgba(127, 29, 29, 0.9); }
        #victory-screen { background: rgba(21, 128, 61, 0.9); }
        #game-over-screen h1 { font-size: 3rem; color: #fca5a5; margin-bottom: 1rem; }
        #victory-screen h1 { font-size: 3rem; color: #86efac; margin-bottom: 1rem; }
        .result-stats { font-size: 1.1rem; color: #e2e8f0; margin-bottom: 1.5rem; }
        .result-stats div { margin: 0.3rem 0; }
        .btn { padding: 0.75rem 2rem; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; }
        .btn:hover { opacity: 0.9; }
        .btn-restart { background: #8b5cf6; color: #fff; }
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
        <div id="start-screen">
            <h1>${project.name}</h1>
            <p>WASD/Arrows to move · SPACE to shoot · Collect runes to win</p>
            <p style="font-size:1rem;color:#64748b">Press any key to start</p>
        </div>
        <div id="game-over-screen">
            <h1>💀 Game Over</h1>
            <div class="result-stats">
                <div id="go-score"></div>
                <div id="go-time"></div>
            </div>
            <button class="btn btn-restart" onclick="location.reload()">Restart</button>
        </div>
        <div id="victory-screen">
            <h1>🏆 Victory!</h1>
            <div class="result-stats">
                <div id="vic-score"></div>
                <div id="vic-time"></div>
            </div>
            <button class="btn btn-restart" onclick="location.reload()">Play Again</button>
        </div>
        <div class="clawgame-brand">Built with ClawGame</div>
    </div>

    <script>
    // ─── Game Data ──────────────────────────────────────────────
    const GAME_DATA = ${JSON.stringify(gameData, null, 2)};

    // ─── Constants (mirrors useGamePreview TYPE_COLORS / TYPE_SIZES) ───
    const TYPE_COLORS = {
      player: '#3b82f6', enemy: '#ef4444', collectible: '#f59e0b',
      obstacle: '#64748b', npc: '#22c55e', item: '#a78bfa', unknown: '#8b5cf6',
    };
    const TYPE_SIZES = {
      player: [32, 48], enemy: [32, 32], collectible: [16, 16],
      obstacle: [32, 32], npc: [32, 48], item: [16, 16], unknown: [32, 32],
    };

    // ─── GameEngine (same simulation rules as web preview) ──────
    class GameEngine {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.running = false;
        this.entities = new Map();
        this.projectiles = [];
        this.keys = {};
        this.lastTime = 0;
        this.frameCount = 0;
        this.assets = new Map();
        this.score = 0;
        this.health = 100;
        this.mana = 100;
        this.invincibleTimer = 0;
        this.gameTime = 0;
        this.gameOver = false;
        this.victory = false;
        this.collectedRuneIds = [];
        this.defeatedEnemies = [];
      }

      init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('keydown', (e) => {
          this.keys[e.key.toLowerCase()] = true;
          if (!this.running) this.start();
        });
        window.addEventListener('keyup', (e) => {
          this.keys[e.key.toLowerCase()] = false;
        });
        this.loadAssets();
        this.setupEntities();
      }

      resizeCanvas() {
        const c = this.canvas.parentElement;
        this.canvas.width = c.clientWidth;
        this.canvas.height = c.clientHeight;
      }

      loadAssets() {
        (GAME_DATA.assets || []).forEach(asset => {
          this.assets.set(asset.id, { ...asset, image: new Image(), loaded: false });
          const a = this.assets.get(asset.id);
          a.image.onload = () => { a.loaded = true; };
          a.image.src = asset.dataUri;
        });
      }

      setupEntities() {
        (GAME_DATA.scene.entities || []).forEach(e => {
          const t = e.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 };
          const eType = e.type || 'unknown';
          const def = TYPE_SIZES[eType] || [32, 32];
          const comps = e.components || {};
          this.entities.set(e.id, {
            id: e.id, type: eType,
            transform: { ...t },
            components: comps,
            color: comps.sprite?.color || TYPE_COLORS[eType] || '#8b5cf6',
            width: comps.sprite?.width || def[0],
            height: comps.sprite?.height || def[1],
            health: comps.stats?.hp || 30,
            maxHealth: comps.stats?.maxHp || comps.stats?.hp || 30,
            damage: comps.stats?.damage || 10,
            enemyType: comps.enemyType || comps.ai?.type || 'slime',
            patrolOrigin: { x: t.x, y: t.y },
            patrolOffset: Math.random() * Math.PI * 2,
            hitFlash: 0, facing: 'right',
          });
        });
      }

      start() {
        const ss = document.getElementById('start-screen');
        if (ss) ss.style.display = 'none';
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
      }

      checkCollision(a, b) {
        const dx = a.transform.x - b.transform.x;
        const dy = a.transform.y - b.transform.y;
        return Math.sqrt(dx * dx + dy * dy) < (a.width + b.width) / 2;
      }

      // ─── UPDATE (matches preview simulation rules) ────────────
      update(deltaTime) {
        if (this.gameOver || this.victory) return;
        const dt = deltaTime;
        const dtSec = dt / 1000;
        const currentTime = performance.now();

        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        this.mana = Math.min(100, this.mana + dt * 0.01);
        this.gameTime += dt;

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
          p.x += p.vx * dtSec;
          p.y += p.vy * dtSec;
          if (p.x < 0 || p.x > this.canvas.width || p.y < 0 || p.y > this.canvas.height) {
            this.projectiles.splice(i, 1); continue;
          }
          // Hit enemies
          let hit = false;
          this.entities.forEach((e) => {
            if (e.type !== 'enemy' || hit) return;
            const dx = p.x - e.transform.x, dy = p.y - e.transform.y;
            if (Math.sqrt(dx*dx+dy*dy) < (e.width + 10) / 2) {
              e.health -= p.damage; e.hitFlash = 200;
              if (e.health <= 0) {
                this.score += 50;
                this.defeatedEnemies.push(e.id);
                this.entities.delete(e.id);
              }
              hit = true;
            }
          });
          if (hit) { this.projectiles.splice(i, 1); continue; }
          // Hit obstacles
          this.entities.forEach((e) => {
            if (e.type !== 'obstacle' || hit) return;
            const dx = p.x - e.transform.x, dy = p.y - e.transform.y;
            if (Math.sqrt(dx*dx+dy*dy) < (e.width + 10) / 2) { hit = true; }
          });
          if (hit) this.projectiles.splice(i, 1);
        }

        // Entities
        const player = this.entities.get('player') || this.entities.get('player-1');
        this.entities.forEach((entity, id) => {
          // Player movement with obstacle collision
          if (entity.components?.playerInput) {
            const speed = entity.components?.movement?.speed || 200;
            let vx = 0, vy = 0;
            if (this.keys['arrowleft'] || this.keys['a']) vx = -speed;
            if (this.keys['arrowright'] || this.keys['d']) vx = speed;
            if (this.keys['arrowup'] || this.keys['w']) vy = -speed;
            if (this.keys['arrowdown'] || this.keys['s']) vy = speed;
            const obstacles = [];
            this.entities.forEach(e => { if (e.type === 'obstacle') obstacles.push(e); });
            const nextX = entity.transform.x + vx * dtSec;
            const testX = { ...entity, transform: { ...entity.transform, x: nextX } };
            if (!obstacles.some(o => id !== o.id && this.checkCollision(testX, o)))
              entity.transform.x = nextX;
            const nextY = entity.transform.y + vy * dtSec;
            const testY = { ...entity, transform: { ...entity.transform, y: nextY } };
            if (!obstacles.some(o => id !== o.id && this.checkCollision(testY, o)))
              entity.transform.y = nextY;
            const margin = entity.width / 2;
            entity.transform.x = Math.max(margin, Math.min(this.canvas.width - margin, entity.transform.x));
            entity.transform.y = Math.max(margin, Math.min(this.canvas.height - margin, entity.transform.y));
            if (vx > 0) entity.facing = 'right';
            if (vx < 0) entity.facing = 'left';
          }

          // Enemy: chase player when close, patrol otherwise
          if (entity.type === 'enemy' && player) {
            const patrolSpeed = entity.components?.ai?.speed || 50;
            const dx = player.transform.x - entity.transform.x;
            const dy = player.transform.y - entity.transform.y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < 200) {
              // Chase
              entity.transform.x += (dx/dist) * patrolSpeed * 0.6 * dtSec;
              entity.transform.y += (dy/dist) * patrolSpeed * 0.6 * dtSec;
              // Damage player on contact
              if (dist < (entity.width + player.width) / 2 && this.invincibleTimer <= 0) {
                this.health -= (entity.damage || 10);
                this.invincibleTimer = 1000;
                if (this.health <= 0) { this.health = 0; this.endGame(false); }
              }
            } else {
              // Patrol (sin/cos around origin)
              const t = currentTime / 1000;
              entity.transform.x = entity.patrolOrigin.x + Math.sin(t * (patrolSpeed/100) + entity.patrolOffset) * 100;
              entity.transform.y = entity.patrolOrigin.y + Math.cos(t * (patrolSpeed/80) + entity.patrolOffset * 2) * 80;
            }
            entity.transform.x = Math.max(entity.width/2, Math.min(this.canvas.width - entity.width/2, entity.transform.x));
            entity.transform.y = Math.max(entity.height/2, Math.min(this.canvas.height - entity.height/2, entity.transform.y));
            if (entity.hitFlash > 0) entity.hitFlash -= dt;
          }

          // Collectible rotation
          if (entity.type === 'collectible') {
            entity.transform.rotation = (entity.transform.rotation || 0) + dt * 0.003;
          }
          // Item rotation
          if (entity.type === 'item') {
            entity.transform.rotation = (entity.transform.rotation || 0) + dt * 0.003;
          }
        });

        // Collectible pickup
        if (player) {
          const toDelete = [];
          this.entities.forEach((item) => {
            if (item.type !== 'collectible' && item.type !== 'item') return;
            const dx = player.transform.x - item.transform.x;
            const dy = player.transform.y - item.transform.y;
            if (Math.sqrt(dx*dx+dy*dy) < (player.width + item.width) / 2) {
              const col = item.components?.collectible || item.components?.itemDrop;
              if (item.type === 'collectible') {
                if (col?.type === 'health') { this.health = Math.min(100, this.health + (col.healAmount || 30)); }
                else if (col?.type === 'rune') {
                  if (!this.collectedRuneIds.includes(item.id)) this.collectedRuneIds.push(item.id);
                }
                this.score += col?.value || 10;
              } else {
                this.score += 10;
              }
              toDelete.push(item.id);
            }
          });
          toDelete.forEach(id => this.entities.delete(id));
        }

        // Victory: all runes collected
        const allRunes = (GAME_DATA.scene.entities || []).filter(
          e => e.type === 'collectible' && e.components?.collectible?.type === 'rune'
        );
        if (allRunes.length > 0 && this.collectedRuneIds.length >= allRunes.length) {
          this.endGame(true);
        }
      }

      endGame(won) {
        if (won) {
          this.victory = true;
          const s = document.getElementById('victory-screen');
          s.style.display = 'flex';
          document.getElementById('vic-score').textContent = 'Score: ' + this.score;
          document.getElementById('vic-time').textContent = 'Time: ' + Math.floor(this.gameTime / 1000) + 's';
        } else {
          this.gameOver = true;
          const s = document.getElementById('game-over-screen');
          s.style.display = 'flex';
          document.getElementById('go-score').textContent = 'Score: ' + this.score;
          document.getElementById('go-time').textContent = 'Time: ' + Math.floor(this.gameTime / 1000) + 's';
        }
      }

      // ─── RENDER (matches preview rendering) ───────────────────
      render() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Render layers (same order as preview: obstacles, items, collectibles, projectiles, enemies, player)
        // Obstacles
        this.entities.forEach(e => {
          if (e.type !== 'obstacle') return;
          const { x, y, scaleX, scaleY } = e.transform;
          const w = e.width, h = e.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          ctx.fillStyle = '#475569'; ctx.fillRect(-w/2, -h/2, w, h);
          ctx.fillStyle = '#64748b'; ctx.fillRect(-w/2, -h/2, w, h * 0.2);
          ctx.fillStyle = '#334155'; ctx.fillRect(w/2 - w*0.1, -h/2, w*0.1, h);
          ctx.restore();
        });

        // Items
        this.entities.forEach(e => {
          if (e.type !== 'item') return;
          const { x, y, rotation } = e.transform;
          const w = e.width, h = e.height;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0);
          ctx.fillStyle = e.color; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w/4, -h/2+1, w/2, h*0.3);
          ctx.restore();
        });

        // Collectibles
        this.entities.forEach(e => {
          if (e.type !== 'collectible') return;
          const { x, y, scaleX, scaleY, rotation } = e.transform;
          const w = e.width, h = e.height;
          const col = e.components?.collectible;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0); ctx.scale(scaleX, scaleY);
          // Glow
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
          grad.addColorStop(0, e.color + '80'); grad.addColorStop(1, e.color + '00');
          ctx.fillStyle = grad; ctx.fillRect(-w, -h, w*2, h*2);
          ctx.fillStyle = e.color; ctx.beginPath();
          if (col?.type === 'rune') { ctx.moveTo(0,-h/2); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2); ctx.lineTo(-w/2,0); ctx.closePath(); }
          else if (col?.type === 'health') { ctx.arc(0, 0, w/2, 0, Math.PI*2); }
          else { ctx.fillRect(-w/2, -h/2, w, h); }
          ctx.fill();
          if (col?.type === 'rune') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(0, 0, w/4, 0, Math.PI*2); ctx.fill(); }
          ctx.restore();
        });

        // Projectiles
        this.projectiles.forEach(p => {
          ctx.save();
          ctx.fillStyle = p.color || '#fbbf24';
          ctx.shadowColor = p.color || '#fbbf24'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        });

        // Enemies
        this.entities.forEach(e => {
          if (e.type !== 'enemy') return;
          const { x, y, scaleX, scaleY } = e.transform;
          const w = e.width, h = e.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          // Body
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color;
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 6); ctx.fill();
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(-w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(-w/5, -h/5, w/12, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w/5, -h/5, w/12, 0, Math.PI*2); ctx.fill();
          // Health bar
          const hpPct = e.health / e.maxHealth;
          ctx.fillStyle = '#1f2937'; ctx.fillRect(-w/2-4, -h/2-10, w+8, 4);
          ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(-w/2-4, -h/2-10, (w+8)*hpPct, 4);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(e.health + '/' + e.maxHealth, 0, -h/2-14);
          ctx.restore();
        });

        // NPCs
        this.entities.forEach(e => {
          if (e.type !== 'npc') return;
          const { x, y, scaleX, scaleY } = e.transform;
          const w = e.width, h = e.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 10); ctx.fill();
          // Hat
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath(); ctx.moveTo(0, -h/2-16); ctx.lineTo(-w/2+2, -h/2+2); ctx.lineTo(w/2-2, -h/2+2); ctx.closePath(); ctx.fill();
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(-w/5, -h/8, w/6, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w/5, -h/8, w/6, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#1e3a5f';
          ctx.beginPath(); ctx.arc(-w/5, -h/8, w/12, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w/5, -h/8, w/12, 0, Math.PI*2); ctx.fill();
          // Name
          ctx.fillStyle = '#e9d5ff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(e.components?.npc?.name || 'NPC', 0, h/2 + 12);
          ctx.restore();
        });

        // Player
        const player = this.entities.get('player') || this.entities.get('player-1');
        if (player) {
          const { x, y, scaleX, scaleY } = player.transform;
          const w = player.width, h = player.height;
          ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
          if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 100) % 2 === 0) ctx.globalAlpha = 0.5;
          ctx.fillStyle = player.color;
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 8); ctx.fill();
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(-w/5, -h/6, w/5, h/5, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w/5, -h/6, w/5, h/5, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#1e3a5f';
          ctx.beginPath(); ctx.arc(-w/5, -h/6, w/10, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w/5, -h/6, w/10, 0, Math.PI*2); ctx.fill();
          // Outline glow
          ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
          ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10;
          ctx.strokeRect(-w/2, -h/2, w, h); ctx.shadowBlur = 0;
          // Label
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
          ctx.shadowColor = '#000'; ctx.shadowBlur = 2; ctx.fillText('YOU', 0, h/2+12); ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ─── HUD (matches preview canvas HUD) ──────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath(); ctx.roundRect(10, 10, 200, 130, 8); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
        ctx.fillText('Score: ' + this.score, 20, 35);
        // Health bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 45, 100, 10);
        ctx.fillStyle = this.health > 50 ? '#22c55e' : this.health > 25 ? '#eab308' : '#ef4444';
        ctx.fillRect(20, 45, 100 * (this.health/100), 10);
        ctx.fillStyle = 'white'; ctx.font = '9px monospace'; ctx.fillText('HP ' + Math.round(this.health), 125, 54);
        // Mana bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 58, 100, 10);
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(20, 58, 100 * (this.mana/100), 10);
        ctx.fillStyle = 'white'; ctx.fillText('MP ' + Math.round(this.mana), 125, 67);
        ctx.font = '12px monospace';
        const fps = Math.round(1000 / (this.lastTime || 16));
        ctx.fillText('FPS: ' + fps, 20, 85);
        ctx.fillText('Runes: ' + this.collectedRuneIds.length, 20, 100);
        ctx.fillText('Time: ' + Math.floor(this.gameTime/1000) + 's', 20, 115);
        ctx.fillText('Entities: ' + this.entities.size, 20, 130);

        // Minimap (matches preview)
        const mmSize = 120, mmX = this.canvas.width - mmSize - 10, mmY = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 6); ctx.fill();
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
        const scX = mmSize / this.canvas.width, scY = mmSize / this.canvas.height;
        this.entities.forEach(e => {
          ctx.fillStyle = TYPE_COLORS[e.type] || '#8b5cf6';
          ctx.fillRect(mmX + e.transform.x * scX - 2, mmY + e.transform.y * scY - 2, 4, 4);
        });
      }

      gameLoop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min(now - this.lastTime, 50);
        this.lastTime = now;
        this.update(dt);
        this.render();
        this.frameCount++;
        requestAnimationFrame(() => this.gameLoop());
      }
    }

    // ─── Initialize ────────────────────────────────────────────
    window.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('game-canvas');
      const engine = new GameEngine(canvas);
      engine.init();

      // SPACE to shoot (matches preview)
      let lastShotTime = 0;
      window.addEventListener('keydown', (e) => {
        if (e.key !== ' ' || !engine.running || engine.gameOver || engine.victory) return;
        e.preventDefault();
        const now = performance.now();
        if (now - lastShotTime < 300) return;
        lastShotTime = now;
        const player = engine.entities.get('player') || engine.entities.get('player-1');
        if (!player) return;
        let dx = 0, dy = 0;
        if (engine.keys['arrowleft'] || engine.keys['a']) dx = -1;
        else if (engine.keys['arrowright'] || engine.keys['d']) dx = 1;
        else if (engine.keys['arrowup'] || engine.keys['w']) dy = -1;
        else if (engine.keys['arrowdown'] || engine.keys['s']) dy = 1;
        else dx = 1;
        if (dx !== 0 && dy !== 0) { const l = Math.sqrt(dx*dx+dy*dy); dx/=l; dy/=l; }
        engine.projectiles.push({
          x: player.transform.x, y: player.transform.y,
          vx: dx * 500, vy: dy * 500,
          damage: 10, color: '#fbbf24', createdAt: now,
        });
      });
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
