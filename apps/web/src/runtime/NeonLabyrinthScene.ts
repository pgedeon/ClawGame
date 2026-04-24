/**
 * NeonLabyrinthScene — Complete Maze Puzzle Adventure
 * WASD/Arrows move, G ghost mode, collect orbs, reach exit
 * Procedural maze, levels, enemies, power-ups, minimap
 */
import { GameObjects, Math as PhaserMath, Input as PhaserInput } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

// ─── Types ───
type Cell = { x: number; y: number; walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }; visited: boolean };
type OrbType = 'energy' | 'speed' | 'time' | 'ghost';
type GameState = 'title' | 'levelIntro' | 'playing' | 'levelComplete' | 'gameover' | 'paused';

interface OrbData { gfx: GameObjects.Arc; glow: GameObjects.Arc; type: OrbType; cx: number; cy: number; alive: boolean; }
interface EnemyData { sprite: GameObjects.Rectangle; glow: GameObjects.Arc; path: { x1: number; y1: number; x2: number; y2: number }; t: number; speed: number; dir: number; }
interface SpikeData { gfx: GameObjects.Rectangle; cx: number; cy: number; timer: number; interval: number; active: boolean; }
interface TrailData { gfx: GameObjects.Arc; life: number; }
interface Particle { gfx: GameObjects.Arc; vx: number; vy: number; life: number; maxLife: number; }

const THEME_COLORS = [
  { wall: 0x4338ca, glow: 0x6366f1 }, // indigo
  { wall: 0x7c3aed, glow: 0xa78bfa }, // violet
  { wall: 0x059669, glow: 0x34d399 }, // emerald
  { wall: 0xd97706, glow: 0xfbbf24 }, // amber
  { wall: 0xe11d48, glow: 0xfb7185 }, // rose
  { wall: 0x0891b2, glow: 0x22d3ee }, // cyan
];

const ORB_COLORS = { energy: 0x22c55e, speed: 0x3b82f6, time: 0xfbbf24, ghost: 0xa855f7 };

export class NeonLabyrinthScene extends ClawgamePhaserScene {
  // Maze
  private maze: Cell[][] = [];
  private cols = 10;
  private rows = 7;
  private cellSize = 40;
  private offsetX = 0;
  private offsetY = 0;
  private wallColor = 0x4338ca;
  private glowColor = 0x6366f1;

  // Player
  private player!: GameObjects.Arc;
  private playerGlow!: GameObjects.Arc;
  private playerCx = 0;
  private playerCy = 0;
  private moving = false;
  private ghostCharges = 0;
  private ghostActive = false;
  private ghostTimer = 0;
  private speedBoost = false;
  private speedTimer = 0;

  // Game state
  private state: GameState = 'title';
  private level = 1;
  private score = 0;
  private timeLeft = 60;
  private orbs: OrbData[] = [];
  private enemies: EnemyData[] = [];
  private spikes: SpikeData[] = [];
  private trails: TrailData[] = [];
  private particles: Particle[] = [];
  private exitCx = 0;
  private exitCy = 0;
  private exitGfx!: GameObjects.Arc;
  private exitGlow!: GameObjects.Arc;
  private orbsCollected = 0;
  private orbsTotal = 0;

  // Wall game objects
  private wallObjects: GameObjects.Rectangle[] = [];

  // UI
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private worldW = 800;
  private worldH = 600;
  private levelText!: GameObjects.Text;
  private scoreText!: GameObjects.Text;
  private timerText!: GameObjects.Text;
  private ghostText!: GameObjects.Text;
  private orbCountText!: GameObjects.Text;
  private overlayGroup: GameObjects.Container | null = null;

  // Minimap
  private minimap!: GameObjects.Graphics;
  private minimapX = 0;
  private minimapY = 0;
  private minimapScale = 0;
  private visitedCells: Set<string> = new Set();

  constructor() { super('neon-labyrinth'); }

  create(): void {
    if (!this.bootstrap) return;
    this.worldW = this.bootstrap.bounds?.width ?? 800;
    this.worldH = this.bootstrap.bounds?.height ?? 600;
    this.cameras?.main?.setBackgroundColor('#050510');
    this.setupInput();
    this.showTitle();
  }

  update(time: number, delta: number): void {
    if (this.state === 'title') {
      if (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.hideOverlay();
        this.level = 1;
        this.score = 0;
        this.startLevel();
      }
      return;
    }

    if (this.state === 'levelIntro') {
      if (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.hideOverlay();
        this.state = 'playing';
      }
      return;
    }

    if (this.state === 'paused') {
      if (PhaserInput.Keyboard.JustDown(this.keys.P)) { this.hideOverlay(); this.state = 'playing'; }
      return;
    }

    if (this.state === 'levelComplete') {
      if (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.hideOverlay();
        this.level++;
        this.startLevel();
      }
      return;
    }

    if (this.state === 'gameover') {
      if (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.hideOverlay();
        this.showTitle();
      }
      return;
    }

    // ─── Playing ───
    if (PhaserInput.Keyboard.JustDown(this.keys.P)) { this.showPause(); return; }

    const dt = delta / 1000;

    // Timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.showGameOver(); return; }

    // Speed boost timer
    if (this.speedBoost) { this.speedTimer -= delta; if (this.speedTimer <= 0) this.speedBoost = false; }

    // Ghost timer
    if (this.ghostActive) {
      this.ghostTimer -= delta;
      if (this.ghostTimer <= 0) { this.ghostActive = false; this.player.setAlpha(1); this.playerGlow.setAlpha(0.15); }
      else {
        this.player.setAlpha(0.4 + Math.sin(time * 0.01) * 0.15);
        this.playerGlow.setAlpha(0.3);
      }
    }

    // Ghost activation
    if (PhaserInput.Keyboard.JustDown(this.keys.G) && this.ghostCharges > 0 && !this.ghostActive) {
      this.ghostCharges--;
      this.ghostActive = true;
      this.ghostTimer = 3000;
    }

    // Player movement
    this.handleMovement();

    // Enemy movement
    this.updateEnemies(dt);

    // Spike timers
    this.updateSpikes(dt);

    // Trail decay
    this.updateTrails(delta);

    // Particles
    this.updateParticles(delta);

    // Check exit
    if (this.playerCx === this.exitCx && this.playerCy === this.exitCy) {
      this.completeLevel();
    }

    // Update UI
    this.updateUI();

    // Update minimap
    this.drawMinimap();

    // Exit glow pulse
    if (this.exitGlow) {
      this.exitGlow.setAlpha(0.15 + Math.sin(time * 0.004) * 0.1);
    }
  }

  // ─── Input ───

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['W','A','S','D','UP','DOWN','LEFT','RIGHT','SPACE','ENTER','P','G']) {
        this.keys[k] = kb.addKey(k);
      }
    }
  }

  // ─── States ───

  private showTitle(): void {
    this.state = 'title';
    const items = [
      this.add.rectangle(0, 0, 300, 220, 0x0f172a, 0.92).setStrokeStyle(1, 0x334155),
      this.add.text(0, -80, 'NEON LABYRINTH', { fontSize: '26px', color: '#22d3ee', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(0, -45, 'A Phaser 4 Maze Puzzle', { fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 0, 'Navigate the maze\nCollect orbs\nReach the exit before time runs out', { fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', align: 'center', lineSpacing: 4 }).setOrigin(0.5),
      this.add.text(0, 60, 'WASD/Arrows move • G ghost mode', { fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 90, 'Press SPACE to Start', { fontSize: '14px', color: '#e2e8f0', fontFamily: 'monospace' }).setOrigin(0.5),
    ];
    this.overlayGroup = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(100);
    this.overlayGroup.add(items);
  }

  private showLevelIntro(): void {
    this.state = 'levelIntro';
    const theme = THEME_COLORS[(this.level - 1) % THEME_COLORS.length];
    const themeNames = ['Indigo', 'Violet', 'Emerald', 'Amber', 'Rose', 'Cyan'];
    const themeName = themeNames[(this.level - 1) % 6];
    const items = [
      this.add.rectangle(0, 0, 280, 160, 0x0f172a, 0.92).setStrokeStyle(2, theme.glow, 0.5),
      this.add.text(0, -50, `Level ${this.level}`, { fontSize: '24px', color: '#e2e8f0', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(0, -20, `Theme: ${themeName}`, { fontSize: '14px', color: '#' + theme.glow.toString(16).padStart(6, '0'), fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 15, `Maze: ${this.cols}×${this.rows} • Time: ${Math.ceil(this.timeLeft)}s`, { fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 50, 'Press SPACE to begin', { fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5),
    ];
    this.overlayGroup = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(100);
    this.overlayGroup.add(items);
  }

  private showPause(): void {
    this.state = 'paused';
    const items = [
      this.add.rectangle(0, 0, 200, 80, 0x0f172a, 0.92).setStrokeStyle(1, 0x334155),
      this.add.text(0, -15, 'PAUSED', { fontSize: '20px', color: '#e2e8f0', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 15, 'Press P to resume', { fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5),
    ];
    this.overlayGroup = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(100);
    this.overlayGroup.add(items);
  }

  private showGameOver(): void {
    this.state = 'gameover';
    const items = [
      this.add.rectangle(0, 0, 280, 180, 0x0f172a, 0.92).setStrokeStyle(1, 0xef4444, 0.5),
      this.add.text(0, -60, 'TIME UP!', { fontSize: '24px', color: '#ef4444', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(0, -25, `Reached Level ${this.level}`, { fontSize: '14px', color: '#e2e8f0', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 5, `Score: ${this.score}`, { fontSize: '18px', color: '#22d3ee', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 40, `Orbs: ${this.orbsCollected}`, { fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 65, 'Press SPACE to continue', { fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5),
    ];
    this.overlayGroup = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(100);
    this.overlayGroup.add(items);
  }

  private completeLevel(): void {
    this.state = 'levelComplete';
    const timeBonus = Math.floor(this.timeLeft) * 5;
    this.score += timeBonus;
    this.spawnCelebration();

    const items = [
      this.add.rectangle(0, 0, 280, 180, 0x0f172a, 0.92).setStrokeStyle(2, 0x22c55e, 0.5),
      this.add.text(0, -60, `Level ${this.level} Complete!`, { fontSize: '20px', color: '#22c55e', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(0, -25, `Orbs: ${this.orbsCollected}/${this.orbsTotal}`, { fontSize: '14px', color: '#fbbf24', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 5, `Time Bonus: +${timeBonus}`, { fontSize: '14px', color: '#22d3ee', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(0, 30, `Total Score: ${this.score}`, { fontSize: '16px', color: '#e2e8f0', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5),
      this.add.text(0, 65, 'Press SPACE for next level', { fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5),
    ];
    this.overlayGroup = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(100);
    this.overlayGroup.add(items);
  }

  private hideOverlay(): void {
    this.overlayGroup?.destroy(true);
    this.overlayGroup = null;
  }

  // ─── Level Setup ───

  private startLevel(): void {
    // Clear previous level
    this.wallObjects.forEach(w => w.destroy());
    this.wallObjects = [];
    this.orbs.forEach(o => { o.gfx.destroy(); o.glow.destroy(); });
    this.enemies.forEach(e => { e.sprite.destroy(); e.glow.destroy(); });
    this.spikes.forEach(s => s.gfx.destroy());
    this.trails.forEach(t => t.gfx.destroy());
    this.particles.forEach(p => p.gfx.destroy());
    if (this.player) this.player.destroy();
    if (this.playerGlow) this.playerGlow.destroy();
    if (this.exitGfx) this.exitGfx.destroy();
    if (this.exitGlow) this.exitGlow.destroy();
    if (this.minimap) this.minimap.destroy();
    this.orbs = [];
    this.enemies = [];
    this.spikes = [];
    this.trails = [];
    this.particles = [];
    this.visitedCells = new Set();
    this.ghostActive = false;
    this.ghostTimer = 0;
    this.speedBoost = false;
    this.speedTimer = 0;
    this.orbsCollected = 0;

    // Maze size scales with level
    this.cols = Math.min(18, 9 + this.level);
    this.rows = Math.min(12, 6 + this.level);
    this.cellSize = Math.min(40, Math.floor(Math.min((this.worldW - 40) / this.cols, (this.worldH - 80) / this.rows)));
    this.offsetX = (this.worldW - this.cols * this.cellSize) / 2;
    this.offsetY = (this.worldH - this.rows * this.cellSize) / 2 + 10;

    // Theme
    const theme = THEME_COLORS[(this.level - 1) % THEME_COLORS.length];
    this.wallColor = theme.wall;
    this.glowColor = theme.glow;

    // Timer
    this.timeLeft = 45 + this.cols * 3 + this.rows * 2;

    // Generate maze
    this.generateMaze();

    // Draw maze walls
    this.drawMaze();

    // Place player at top-left
    this.playerCx = 0;
    this.playerCy = 0;
    const px = this.cellToPixelX(0);
    const py = this.cellToPixelY(0);
    this.player = this.add.circle(px, py, this.cellSize * 0.3, 0x22d3ee).setDepth(20);
    this.playerGlow = this.add.circle(px, py, this.cellSize * 0.45, 0x22d3ee, 0.15).setDepth(19);
    this.tweens?.add({ targets: this.playerGlow, scaleX: 1.4, scaleY: 1.4, alpha: 0.05, duration: 800, yoyo: true, repeat: -1 });

    // Place exit at bottom-right
    this.exitCx = this.cols - 1;
    this.exitCy = this.rows - 1;
    const ex = this.cellToPixelX(this.exitCx);
    const ey = this.cellToPixelY(this.exitCy);
    this.exitGlow = this.add.circle(ex, ey, this.cellSize * 0.45, 0xfbbf24, 0.15).setDepth(18);
    this.exitGfx = this.add.circle(ex, ey, this.cellSize * 0.25, 0xfbbf24).setDepth(19);
    this.tweens?.add({ targets: this.exitGfx, angle: 360, duration: 2000, repeat: -1 });
    this.tweens?.add({ targets: this.exitGlow, scaleX: 1.6, scaleY: 1.6, alpha: 0.05, duration: 700, yoyo: true, repeat: -1 });

    // Place orbs
    this.placeOrbs();

    // Place enemies (from level 2+)
    if (this.level >= 2) this.placeEnemies();

    // Place spikes (from level 3+)
    if (this.level >= 3) this.placeSpikes();

    // HUD
    this.createHUD();

    // Minimap
    this.createMinimap();

    // Mark starting cell visited
    this.visitedCells.add('0,0');

    this.showLevelIntro();
  }

  // ─── Maze Generation (Recursive Backtracker) ───

  private generateMaze(): void {
    this.maze = [];
    for (let y = 0; y < this.rows; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.maze[y][x] = { x, y, walls: { top: true, right: true, bottom: true, left: true }, visited: false };
      }
    }

    const stack: Cell[] = [];
    const start = this.maze[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        next.visited = true;
        stack.push(next);
      }
    }
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const n: Cell[] = [];
    const { x, y } = cell;
    if (y > 0 && !this.maze[y - 1][x].visited) n.push(this.maze[y - 1][x]);
    if (x < this.cols - 1 && !this.maze[y][x + 1].visited) n.push(this.maze[y][x + 1]);
    if (y < this.rows - 1 && !this.maze[y + 1][x].visited) n.push(this.maze[y + 1][x]);
    if (x > 0 && !this.maze[y][x - 1].visited) n.push(this.maze[y][x - 1]);
    return n;
  }

  private removeWall(a: Cell, b: Cell): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 1) { a.walls.right = false; b.walls.left = false; }
    if (dx === -1) { a.walls.left = false; b.walls.right = false; }
    if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
    if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
  }

  private canMove(fromCx: number, fromCy: number, dx: number, dy: number): boolean {
    const cell = this.maze[fromCy]?.[fromCx];
    if (!cell) return false;
    if (dx === 1 && cell.walls.right) return false;
    if (dx === -1 && cell.walls.left) return false;
    if (dy === 1 && cell.walls.bottom) return false;
    if (dy === -1 && cell.walls.top) return false;
    const nx = fromCx + dx, ny = fromCy + dy;
    return nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows;
  }

  // ─── Draw Maze ───

  private drawMaze(): void {
    const cs = this.cellSize;
    const wallThick = Math.max(2, Math.floor(cs * 0.08));

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.maze[y][x];
        const cx = this.offsetX + x * cs;
        const cy = this.offsetY + y * cs;

        if (cell.walls.top) {
          const w = this.add.rectangle(cx + cs / 2, cy, cs + wallThick, wallThick, this.wallColor).setDepth(5);
          w.setStrokeStyle(1, this.glowColor, 0.2);
          this.wallObjects.push(w);
        }
        if (cell.walls.left) {
          const w = this.add.rectangle(cx, cy + cs / 2, wallThick, cs + wallThick, this.wallColor).setDepth(5);
          w.setStrokeStyle(1, this.glowColor, 0.2);
          this.wallObjects.push(w);
        }
        if (x === this.cols - 1 && cell.walls.right) {
          const w = this.add.rectangle(cx + cs, cy + cs / 2, wallThick, cs + wallThick, this.wallColor).setDepth(5);
          w.setStrokeStyle(1, this.glowColor, 0.2);
          this.wallObjects.push(w);
        }
        if (y === this.rows - 1 && cell.walls.bottom) {
          const w = this.add.rectangle(cx + cs / 2, cy + cs, cs + wallThick, wallThick, this.wallColor).setDepth(5);
          w.setStrokeStyle(1, this.glowColor, 0.2);
          this.wallObjects.push(w);
        }
      }
    }
  }

  // ─── Place Entities ───

  private placeOrbs(): void {
    const available: { x: number; y: number }[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if ((x === 0 && y === 0) || (x === this.exitCx && y === this.exitCy)) continue;
        available.push({ x, y });
      }
    }

    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    const energyCount = 5 + this.level;
    const speedCount = Math.max(1, Math.floor(this.level * 0.7));
    const timeCount = Math.max(1, Math.floor(this.level * 0.5));
    const ghostCount = Math.max(1, Math.floor(this.level * 0.3));
    const total = energyCount + speedCount + timeCount + ghostCount;
    let idx = 0;

    const createOrb = (type: OrbType) => {
      if (idx >= available.length) return;
      const { x, y } = available[idx++];
      const px = this.cellToPixelX(x);
      const py = this.cellToPixelY(y);
      const color = ORB_COLORS[type];
      const glow = this.add.circle(px, py, this.cellSize * 0.35, color, 0.1).setDepth(14);
      const gfx = this.add.circle(px, py, this.cellSize * 0.18, color).setDepth(15);
      this.tweens?.add({ targets: glow, scaleX: 1.8, scaleY: 1.8, alpha: 0.03, duration: 700, yoyo: true, repeat: -1 });
      this.orbs.push({ gfx, glow, type, cx: x, cy: y, alive: true });
    };

    for (let i = 0; i < energyCount; i++) createOrb('energy');
    for (let i = 0; i < speedCount; i++) createOrb('speed');
    for (let i = 0; i < timeCount; i++) createOrb('time');
    for (let i = 0; i < ghostCount; i++) createOrb('ghost');

    this.orbsTotal = this.orbs.length;
  }

  private placeEnemies(): void {
    const count = Math.min(5, this.level - 1);
    for (let i = 0; i < count; i++) {
      // Find a cell that's not start or exit
      let cx: number, cy: number;
      do {
        cx = Math.floor(Math.random() * this.cols);
        cy = Math.floor(Math.random() * this.rows);
      } while ((cx === 0 && cy === 0) || (cx === this.exitCx && cy === this.exitCy));

      // Find a connected corridor for patrol path
      const cell = this.maze[cy][cx];
      const dirs: { dx: number; dy: number; wall: string }[] = [
        { dx: 1, dy: 0, wall: 'right' }, { dx: -1, dy: 0, wall: 'left' },
        { dx: 0, dy: 1, wall: 'bottom' }, { dx: 0, dy: -1, wall: 'top' },
      ];
      const openDirs = dirs.filter(d => !(cell.walls as any)[d.wall]);
      if (openDirs.length === 0) continue;

      // Pick a direction and find how far we can go
      const dir = openDirs[Math.floor(Math.random() * openDirs.length)];
      let len = 0;
      let nx = cx, ny = cy;
      while (true) {
        const nnx = nx + dir.dx, nny = ny + dir.dy;
        if (nnx < 0 || nnx >= this.cols || nny < 0 || nny >= this.rows) break;
        if (!this.canMove(nx, ny, dir.dx, dir.dy)) break;
        nx = nnx; ny = nny; len++;
        if (len >= 4) break;
      }

      if (len < 1) continue;

      const x1 = this.cellToPixelX(cx), y1 = this.cellToPixelY(cy);
      const x2 = this.cellToPixelX(nx), y2 = this.cellToPixelY(ny);
      const sprite = this.add.rectangle(x1, y1, this.cellSize * 0.4, this.cellSize * 0.4, 0xef4444).setDepth(18);
      const glow = this.add.circle(x1, y1, this.cellSize * 0.35, 0xef4444, 0.12).setDepth(17);
      this.tweens?.add({ targets: glow, scaleX: 1.6, scaleY: 1.6, alpha: 0.03, duration: 500, yoyo: true, repeat: -1 });
      this.enemies.push({ sprite, glow, path: { x1, y1, x2, y2 }, t: 0, speed: 0.4 + Math.random() * 0.3, dir: 1 });
    }
  }

  private placeSpikes(): void {
    const count = Math.min(6, this.level - 2);
    for (let i = 0; i < count; i++) {
      let cx: number, cy: number;
      do {
        cx = Math.floor(Math.random() * this.cols);
        cy = Math.floor(Math.random() * this.rows);
      } while ((cx === 0 && cy === 0) || (cx === this.exitCx && cy === this.exitCy));

      const px = this.cellToPixelX(cx);
      const py = this.cellToPixelY(cy);
      const gfx = this.add.rectangle(px, py, this.cellSize * 0.3, this.cellSize * 0.3, 0xf97316).setDepth(16).setAlpha(0.6);
      this.spikes.push({ gfx, cx, cy, timer: Math.random() * 3000, interval: 2500 + Math.random() * 1500, active: true });
    }
  }

  // ─── Movement ───

  private handleMovement(): void {
    if (this.moving || !this.player) return;

    let dx = 0, dy = 0;
    if (PhaserInput.Keyboard.JustDown(this.keys.UP) || PhaserInput.Keyboard.JustDown(this.keys.W)) dy = -1;
    else if (PhaserInput.Keyboard.JustDown(this.keys.DOWN) || PhaserInput.Keyboard.JustDown(this.keys.S)) dy = 1;
    else if (PhaserInput.Keyboard.JustDown(this.keys.LEFT) || PhaserInput.Keyboard.JustDown(this.keys.A)) dx = -1;
    else if (PhaserInput.Keyboard.JustDown(this.keys.RIGHT) || PhaserInput.Keyboard.JustDown(this.keys.D)) dx = 1;
    else return;

    const canPass = this.ghostActive || this.canMove(this.playerCx, this.playerCy, dx, dy);
    if (!canPass) return;

    const ncx = this.playerCx + dx;
    const ncy = this.playerCy + dy;
    if (ncx < 0 || ncx >= this.cols || ncy < 0 || ncy >= this.rows) return;

    this.playerCx = ncx;
    this.playerCy = ncy;
    this.moving = true;
    this.visitedCells.add(`${ncx},${ncy}`);

    // Leave trail
    const oldPx = this.player.x;
    const oldPy = this.player.y;
    const trail = this.add.circle(oldPx, oldPy, this.cellSize * 0.15, 0x22d3ee, 0.2).setDepth(12);
    this.trails.push({ gfx: trail, life: 3000 });

    const targetX = this.cellToPixelX(ncx);
    const targetY = this.cellToPixelY(ncy);
    const dur = this.speedBoost ? 80 : 130;

    this.tweens?.add({
      targets: this.player, x: targetX, y: targetY, duration: dur, ease: 'Linear',
      onComplete: () => { this.moving = false; },
    });
    this.tweens?.add({
      targets: this.playerGlow, x: targetX, y: targetY, duration: dur, ease: 'Linear',
    });

    // Check orb pickup
    for (const orb of this.orbs) {
      if (orb.alive && orb.cx === ncx && orb.cy === ncy) {
        orb.alive = false;
        this.tweens?.add({
          targets: [orb.gfx, orb.glow], scaleX: 3, scaleY: 3, alpha: 0, duration: 200,
          onComplete: () => { orb.gfx.destroy(); orb.glow.destroy(); },
        });
        this.collectOrb(orb.type);
        this.spawnOrbParticles(targetX, targetY, ORB_COLORS[orb.type]);
      }
    }

    // Check enemy collision
    for (const e of this.enemies) {
      const eCx = this.pixelToCellX(e.sprite.x);
      const eCy = this.pixelToCellY(e.sprite.y);
      if (eCx === ncx && eCy === ncy) {
        this.hitByEnemy();
      }
    }

    // Check spike collision
    for (const s of this.spikes) {
      if (s.active && s.cx === ncx && s.cy === ncy) {
        this.hitBySpike();
      }
    }
  }

  // ─── Entity Updates ───

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      e.t += dt * e.speed * e.dir;
      if (e.t >= 1) { e.t = 1; e.dir = -1; }
      if (e.t <= 0) { e.t = 0; e.dir = 1; }

      const x = PhaserMath.Linear(e.path.x1, e.path.x2, e.t);
      const y = PhaserMath.Linear(e.path.y1, e.path.y2, e.t);
      e.sprite.setPosition(x, y);
      e.glow.setPosition(x, y);

      // Check collision with player
      if (!this.ghostActive && this.player) {
        const dist = Math.sqrt((this.player.x - x) ** 2 + (this.player.y - y) ** 2);
        if (dist < this.cellSize * 0.45) {
          this.hitByEnemy();
        }
      }
    }
  }

  private updateSpikes(dt: number): void {
    for (const s of this.spikes) {
      s.timer -= dt * 1000;
      if (s.timer <= 0) {
        s.active = !s.active;
        s.timer = s.interval;
        s.gfx.setAlpha(s.active ? 0.7 : 0.15);
        s.gfx.setFillStyle(s.active ? 0xf97316 : 0x554433);
      }
    }
  }

  private updateTrails(delta: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= delta;
      t.gfx.setAlpha(Math.max(0, t.life / 3000) * 0.2);
      if (t.life <= 0) { t.gfx.destroy(); this.trails.splice(i, 1); }
    }
  }

  private collectOrb(type: OrbType): void {
    this.orbsCollected++;
    if (type === 'energy') this.score += 10;
    if (type === 'speed') { this.score += 5; this.speedBoost = true; this.speedTimer = 5000; }
    if (type === 'time') { this.score += 5; this.timeLeft += 10; }
    if (type === 'ghost') { this.score += 20; this.ghostCharges++; }
  }

  private hitByEnemy(): void {
    if (this.ghostActive) return;
    this.timeLeft -= 5;
    this.cameras?.main?.shake(200, 0.01);
    this.respawnAtStart();
  }

  private hitBySpike(): void {
    if (this.ghostActive) return;
    this.timeLeft -= 3;
    this.cameras?.main?.shake(100, 0.005);
  }

  private respawnAtStart(): void {
    this.playerCx = 0;
    this.playerCy = 0;
    const px = this.cellToPixelX(0);
    const py = this.cellToPixelY(0);
    this.player.setPosition(px, py);
    this.playerGlow.setPosition(px, py);
    this.moving = false;
  }

  // ─── Minimap ───

  private createMinimap(): void {
    this.minimapX = this.worldW - 10;
    this.minimapY = 10;
    this.minimapScale = Math.min(100 / this.cols, 80 / this.rows);
    this.minimap = this.add.graphics().setDepth(50).setScrollFactor(0);
  }

  private drawMinimap(): void {
    if (!this.minimap) return;
    const mm = this.minimap;
    const s = this.minimapScale;
    const ox = this.minimapX - this.cols * s;
    const oy = this.minimapY;

    mm.clear();
    mm.setScrollFactor(0);

    // Background
    mm.fillStyle(0x0f172a, 0.8);
    mm.fillRect(ox - 2, oy - 2, this.cols * s + 4, this.rows * s + 4);

    // Visited cells
    mm.fillStyle(0x1e293b, 0.6);
    for (const key of this.visitedCells) {
      const [cx, cy] = key.split(',').map(Number);
      mm.fillRect(ox + cx * s, oy + cy * s, s, s);
    }

    // Orbs
    for (const orb of this.orbs) {
      if (!orb.alive) continue;
      mm.fillStyle(ORB_COLORS[orb.type], 0.8);
      mm.fillRect(ox + orb.cx * s + s * 0.3, oy + orb.cy * s + s * 0.3, s * 0.4, s * 0.4);
    }

    // Exit
    mm.fillStyle(0xfbbf24, 0.9);
    mm.fillRect(ox + this.exitCx * s, oy + this.exitCy * s, s, s);

    // Player
    mm.fillStyle(0x22d3ee, 1);
    mm.fillRect(ox + this.playerCx * s, oy + this.playerCy * s, s, s);
  }

  // ─── HUD ───

  private createHUD(): void {
    if (this.levelText) this.levelText.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.timerText) this.timerText.destroy();
    if (this.ghostText) this.ghostText.destroy();
    if (this.orbCountText) this.orbCountText.destroy();

    this.levelText = this.add.text(10, 5, '', { fontSize: '12px', color: '#a78bfa', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.scoreText = this.add.text(10, 20, '', { fontSize: '11px', color: '#22d3ee', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.timerText = this.add.text(10, 35, '', { fontSize: '13px', color: '#fbbf24', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.ghostText = this.add.text(10, 50, '', { fontSize: '10px', color: '#a855f7', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.orbCountText = this.add.text(10, 63, '', { fontSize: '10px', color: '#22c55e', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
  }

  private updateUI(): void {
    this.levelText?.setText(`Level ${this.level}  ${this.cols}×${this.rows}`);
    this.scoreText?.setText(`Score: ${this.score}`);
    const timeColor = this.timeLeft > 15 ? '#fbbf24' : this.timeLeft > 5 ? '#f97316' : '#ef4444';
    this.timerText?.setStyle({ color: timeColor });
    this.timerText?.setText(`Time: ${Math.ceil(this.timeLeft)}s`);
    const ghostStr = this.ghostActive ? `👻 ACTIVE ${Math.ceil(this.ghostTimer / 1000)}s` : `👻 ${this.ghostCharges} charges`;
    this.ghostText?.setText(this.ghostCharges > 0 || this.ghostActive ? ghostStr : '');
    this.orbCountText?.setText(`Orbs: ${this.orbsCollected}/${this.orbsTotal}`);
  }

  // ─── Particles ───

  private spawnOrbParticles(x: number, y: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 40 + Math.random() * 60;
      const gfx = this.add.circle(x, y, 2, color, 0.8).setDepth(25);
      this.particles.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 400, maxLife: 400 });
    }
  }

  private spawnCelebration(): void {
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    const colors = [0x22c55e, 0x3b82f6, 0xfbbf24, 0xa855f7, 0x22d3ee, 0xef4444];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const gfx = this.add.circle(cx, cy, 2 + Math.random() * 3, color, 0.9).setDepth(60);
      this.particles.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 800 + Math.random() * 600, maxLife: 1400 });
    }
  }

  private updateParticles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.gfx.setAlpha(Math.max(0, p.life / p.maxLife) * 0.8);
      if (p.life <= 0) { p.gfx.destroy(); this.particles.splice(i, 1); }
    }
  }

  // ─── Helpers ───

  private cellToPixelX(cx: number): number { return this.offsetX + cx * this.cellSize + this.cellSize / 2; }
  private cellToPixelY(cy: number): number { return this.offsetY + cy * this.cellSize + this.cellSize / 2; }
  private pixelToCellX(px: number): number { return Math.floor((px - this.offsetX) / this.cellSize); }
  private pixelToCellY(py: number): number { return Math.floor((py - this.offsetY) / this.cellSize); }
}
