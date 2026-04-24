/**
 * NeonLabyrinthScene — Maze Puzzle Demo
 * Showcases Phaser 4 features:
 * - Procedural maze generation (recursive backtracker)
 * - Tween chains and easing functions
 * - Glow/aura rendering (layered alpha circles)
 * - Zone triggers for collectibles and exits
 * - Camera follow with lerp
 * - Particle burst on collection
 * - Color interpolation and tint effects
 */
import { Scene, GameObjects, Math as PhaserMath, Input as PhaserInput, Scale } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

interface MazeCell { x: number; y: number; walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }; visited: boolean; }
interface Orb { sprite: GameObjects.Arc; glow: GameObjects.Arc; collected: boolean; pulseTween: Phaser.Tweens.Tween | null; }
interface Particle { gfx: GameObjects.Arc; vx: number; vy: number; life: number; maxLife: number; }

export class NeonLabyrinthScene extends ClawgamePhaserScene {
  private player!: GameObjects.Rectangle;
  private playerGlow!: GameObjects.Arc;
  private maze: MazeCell[][] = [];
  private orbs: Orb[] = [];
  private particles: Particle[] = [];
  private exitZone!: GameObjects.Arc;
  private exitGlow!: GameObjects.Arc;

  private cols = 12;
  private rows = 9;
  private cellSize = 50;
  private offsetX = 0;
  private offsetY = 0;

  private score = 0;
  private orbsCollected = 0;
  private totalOrbs = 0;
  private levelComplete = false;
  private moveCooldown = 0;

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private worldW = 800;
  private worldH = 600;

  // UI
  private scoreText!: GameObjects.Text;
  private orbText!: GameObjects.Text;
  private messageText!: GameObjects.Text;
  private messageTimer = 0;

  // Wall graphics
  private wallGraphics!: GameObjects.Graphics;

  constructor() { super('neon-labyrinth'); }

  create(): void {
    if (!this.bootstrap) return;
    this.worldW = this.bootstrap.bounds?.width ?? 800;
    this.worldH = this.bootstrap.bounds?.height ?? 600;
    this.cameras?.main?.setBackgroundColor('#0a0a1a');

    // Input
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ENTER']) {
        this.keys[k] = kb.addKey(k);
      }
    }

    // Calculate maze sizing
    this.cellSize = Math.min(Math.floor((this.worldW - 40) / this.cols), Math.floor((this.worldH - 80) / this.rows));
    this.offsetX = (this.worldW - this.cols * this.cellSize) / 2;
    this.offsetY = (this.worldH - this.rows * this.cellSize) / 2 + 10;

    this.generateMaze();
    this.renderMaze();
    this.placeOrbs();
    this.placeExit();
    this.createPlayer();

    // UI
    this.scoreText = this.add.text(14, 14, 'Orbs: 0/0', { fontSize: '13px', color: '#a78bfa', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.orbText = this.add.text(this.worldW - 14, 14, 'Score: 0', { fontSize: '13px', color: '#22c55e', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);
    this.messageText = this.add.text(this.worldW / 2, this.worldH / 2, '', { fontSize: '18px', color: '#a78bfa', fontFamily: 'monospace', fontStyle: 'bold', backgroundColor: '#0a0a1acc', padding: { x: 16, y: 8 } }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setVisible(false);

    this.showMessage('Collect all orbs → reach the exit', 3500);
  }

  update(time: number, delta: number): void {
    if (!this.player || this.levelComplete) return;

    this.moveCooldown -= delta;
    if (this.moveCooldown > 0) return;

    // Grid-based movement
    let dx = 0, dy = 0;
    if (PhaserInput.Keyboard.JustDown(this.keys.UP) || PhaserInput.Keyboard.JustDown(this.keys.W)) dy = -1;
    else if (PhaserInput.Keyboard.JustDown(this.keys.DOWN) || PhaserInput.Keyboard.JustDown(this.keys.S)) dy = 1;
    else if (PhaserInput.Keyboard.JustDown(this.keys.LEFT) || PhaserInput.Keyboard.JustDown(this.keys.A)) dx = -1;
    else if (PhaserInput.Keyboard.JustDown(this.keys.RIGHT) || PhaserInput.Keyboard.JustDown(this.keys.D)) dx = 1;

    if (dx !== 0 || dy !== 0) {
      this.moveCooldown = 120;
      this.tryMove(dx, dy);
    }

    // Check orb collection
    this.checkOrbCollection();

    // Check exit
    this.checkExit();

    // Update particles
    this.updateParticles(delta);

    // Message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= delta;
      if (this.messageTimer <= 0 && this.messageText) this.messageText.setVisible(false);
    }

    // Player glow follows
    if (this.playerGlow) {
      this.playerGlow.setPosition(this.player.x, this.player.y);
    }
  }

  // ─── Maze Generation (Recursive Backtracker) ───

  private generateMaze(): void {
    // Initialize grid
    this.maze = [];
    for (let y = 0; y < this.rows; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.maze[y][x] = { x, y, walls: { top: true, right: true, bottom: true, left: true }, visited: false };
      }
    }

    // DFS
    const stack: MazeCell[] = [];
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
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      }
    }
  }

  private getUnvisitedNeighbors(cell: MazeCell): MazeCell[] {
    const { x, y } = cell;
    const neighbors: MazeCell[] = [];
    if (y > 0 && !this.maze[y - 1][x].visited) neighbors.push(this.maze[y - 1][x]);
    if (x < this.cols - 1 && !this.maze[y][x + 1].visited) neighbors.push(this.maze[y][x + 1]);
    if (y < this.rows - 1 && !this.maze[y + 1][x].visited) neighbors.push(this.maze[y + 1][x]);
    if (x > 0 && !this.maze[y][x - 1].visited) neighbors.push(this.maze[y][x - 1]);
    return neighbors;
  }

  private removeWallBetween(a: MazeCell, b: MazeCell): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 1) { a.walls.right = false; b.walls.left = false; }
    if (dx === -1) { a.walls.left = false; b.walls.right = false; }
    if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
    if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
  }

  // ─── Rendering ───

  private renderMaze(): void {
    this.wallGraphics = this.add.graphics().setDepth(3);
    this.wallGraphics.lineStyle(2, 0x6366f1, 0.8);

    // Background glow layer
    const bgGlow = this.add.graphics().setDepth(1);
    bgGlow.lineStyle(6, 0x6366f1, 0.1);
    bgGlow.fillStyle(0x0f0f2e, 0.5);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.maze[y][x];
        const cx = this.offsetX + x * this.cellSize;
        const cy = this.offsetY + y * this.cellSize;
        const cs = this.cellSize;

        // Cell floor
        bgGlow.fillRect(cx + 1, cy + 1, cs - 2, cs - 2);

        if (cell.walls.top) {
          this.wallGraphics.lineBetween(cx, cy, cx + cs, cy);
          bgGlow.lineBetween(cx, cy, cx + cs, cy);
        }
        if (cell.walls.right) {
          this.wallGraphics.lineBetween(cx + cs, cy, cx + cs, cy + cs);
          bgGlow.lineBetween(cx + cs, cy, cx + cs, cy + cs);
        }
        if (cell.walls.bottom) {
          this.wallGraphics.lineBetween(cx, cy + cs, cx + cs, cy + cs);
          bgGlow.lineBetween(cx, cy + cs, cx + cs, cy + cs);
        }
        if (cell.walls.left) {
          this.wallGraphics.lineBetween(cx, cy, cx, cy + cs);
          bgGlow.lineBetween(cx, cy, cx, cy + cs);
        }
      }
    }

    // Corner dots for visual flair
    for (let y = 0; y <= this.rows; y++) {
      for (let x = 0; x <= this.cols; x++) {
        this.add.circle(
          this.offsetX + x * this.cellSize,
          this.offsetY + y * this.cellSize,
          2, 0x818cf8, 0.5,
        ).setDepth(4);
      }
    }
  }

  // ─── Orbs ───

  private placeOrbs(): void {
    this.orbs = [];
    const orbCount = 5 + Math.floor(Math.random() * 4);
    const placed = new Set<string>();

    for (let i = 0; i < orbCount; i++) {
      let cx: number, cy: number, key: string;
      do {
        cx = Math.floor(Math.random() * this.cols);
        cy = Math.floor(Math.random() * this.rows);
        key = `${cx},${cy}`;
      } while (placed.has(key) || (cx === 0 && cy === 0));

      placed.add(key);
      const px = this.offsetX + cx * this.cellSize + this.cellSize / 2;
      const py = this.offsetY + cy * this.cellSize + this.cellSize / 2;

      const colors = [0x22c55e, 0x3b82f6, 0xf59e0b, 0xec4899, 0x8b5cf6];
      const color = colors[i % colors.length];

      const glow = this.add.circle(px, py, 12, color, 0.1).setDepth(6);
      const sprite = this.add.circle(px, py, 5, color).setDepth(7);

      // Pulsing glow tween — Phaser 4 feature
      const pulseTween = this.tweens?.add({
        targets: glow, scaleX: 1.6, scaleY: 1.6, alpha: 0.2,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 200,
      }) ?? null;

      // Bob the orb
      this.tweens?.add({
        targets: sprite, y: py - 4, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 150,
      });

      this.orbs.push({ sprite, glow, collected: false, pulseTween });
    }
    this.totalOrbs = this.orbs.length;
  }

  // ─── Exit ───

  private placeExit(): void {
    const ex = this.cols - 1;
    const ey = this.rows - 1;
    const px = this.offsetX + ex * this.cellSize + this.cellSize / 2;
    const py = this.offsetY + ey * this.cellSize + this.cellSize / 2;

    this.exitGlow = this.add.circle(px, py, 18, 0xfbbf24, 0.08).setDepth(6);
    this.exitZone = this.add.circle(px, py, 8, 0xfbbf24, 0.3).setDepth(7);
    this.exitZone.setStrokeStyle(2, 0xfbbf24, 0.6);

    // Pulsing exit glow
    this.tweens?.add({
      targets: this.exitGlow, scaleX: 2, scaleY: 2, alpha: 0.15,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Rotating diamond shape on exit
    const diamond = this.add.rectangle(px, py, 10, 10, 0xfbbf24, 0.6).setDepth(8);
    diamond.angle = 45;
    this.tweens?.add({ targets: diamond, angle: 405, duration: 4000, repeat: -1 });
  }

  // ─── Player ───

  private createPlayer(): void {
    const px = this.offsetX + this.cellSize / 2;
    const py = this.offsetY + this.cellSize / 2;

    this.player = this.add.rectangle(px, py, 14, 14, 0x00ffcc).setDepth(10);
    this.player.setStrokeStyle(1, 0x00ffcc, 0.6);

    // Player glow
    this.playerGlow = this.add.circle(px, py, 20, 0x00ffcc, 0.08).setDepth(9);
    this.tweens?.add({
      targets: this.playerGlow, scaleX: 1.3, scaleY: 1.3, alpha: 0.15,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ─── Movement ───

  private getGridPos(): { gx: number; gy: number } {
    const gx = Math.round((this.player.x - this.offsetX - this.cellSize / 2) / this.cellSize);
    const gy = Math.round((this.player.y - this.offsetY - this.cellSize / 2) / this.cellSize);
    return { gx, gy };
  }

  private tryMove(dx: number, dy: number): void {
    const { gx, gy } = this.getGridPos();
    const cell = this.maze[gy]?.[gx];
    if (!cell) return;

    // Check walls
    if (dx === 1 && cell.walls.right) return;
    if (dx === -1 && cell.walls.left) return;
    if (dy === 1 && cell.walls.bottom) return;
    if (dy === -1 && cell.walls.top) return;

    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) return;

    // Smooth tween to new position — Phaser 4 tween feature
    const targetX = this.offsetX + nx * this.cellSize + this.cellSize / 2;
    const targetY = this.offsetY + ny * this.cellSize + this.cellSize / 2;
    this.tweens?.add({
      targets: this.player, x: targetX, y: targetY,
      duration: 100, ease: 'Quad.easeInOut',
    });
  }

  // ─── Collection ───

  private checkOrbCollection(): void {
    const { gx, gy } = this.getGridPos();
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      const orbGx = Math.round((orb.sprite.x - this.offsetX - this.cellSize / 2) / this.cellSize);
      const orbGy = Math.round((orb.sprite.y - this.offsetY - this.cellSize / 2) / this.cellSize);
      if (gx === orbGx && gy === orbGy) {
        orb.collected = true;
        this.orbsCollected++;
        this.score += 50;
        this.spawnCollectParticles(orb.sprite.x, orb.sprite.y);

        // Animate collection — scale up and fade
        if (orb.pulseTween) orb.pulseTween.stop();
        this.tweens?.add({
          targets: [orb.sprite, orb.glow],
          scaleX: 3, scaleY: 3, alpha: 0,
          duration: 300, ease: 'Back.easeIn',
          onComplete: () => { orb.sprite.destroy(); orb.glow.destroy(); },
        });
      }
    }
  }

  // ─── Exit check ───

  private checkExit(): void {
    if (this.orbsCollected < this.totalOrbs) return;
    const { gx, gy } = this.getGridPos();
    if (gx === this.cols - 1 && gy === this.rows - 1) {
      this.levelComplete = true;
      this.score += 100;
      this.showMessage(`🎉 Level Complete! Score: ${this.score}`, 5000);

      // Celebration particles
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 60;
        const px = this.player.x + Math.cos(angle) * dist;
        const py = this.player.y + Math.sin(angle) * dist;
        const colors = [0xfbbf24, 0x22c55e, 0x3b82f6, 0xec4899, 0xa78bfa];
        const c = this.add.circle(px, py, 3, colors[Math.floor(Math.random() * 5)]).setDepth(20).setAlpha(0.9);
        this.tweens?.add({
          targets: c, y: py - 80 - Math.random() * 60, alpha: 0, scaleX: 0.2, scaleY: 0.2,
          duration: 1000 + Math.random() * 1000, ease: 'Cubic.easeOut', onComplete: () => c.destroy(),
        });
      }

      // Regenerate after delay
      this.time.delayedCall(5000, () => {
        this.levelComplete = false;
        this.cols = Math.min(this.cols + 1, 18);
        this.rows = Math.min(this.rows + 1, 12);
        this.scene.restart();
      });
    }
  }

  // ─── Particles ───

  private spawnCollectParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 40 + Math.random() * 60;
      const colors = [0x22c55e, 0xa78bfa, 0x00ffcc];
      const gfx = this.add.circle(x, y, 2, colors[Math.floor(Math.random() * 3)]).setAlpha(0.8).setDepth(15);
      this.particles.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 400, maxLife: 400 });
    }
  }

  private updateParticles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife) * 0.8;
      if (p.life <= 0) { p.gfx.destroy(); this.particles.splice(i, 1); }
    }
  }

  // ─── Helpers ───

  private showMessage(text: string, dur: number): void {
    if (!this.messageText) return;
    this.messageText.setText(text).setVisible(true).setAlpha(1);
    this.messageTimer = dur;
    this.tweens?.add({ targets: this.messageText, alpha: 0, delay: dur - 500, duration: 500 });
  }
}
