/**
 * Eclipse of Runes — Main Game Entry
 * A FUN action RPG with satisfying combat, juicy feedback, and clear goals.
 * 
 * Controls:
 * - WASD / Arrow keys: Move
 * - Space / J: Attack
 * - Enter / E: Advance dialogue
 */

import { TilemapEngine, TilemapData } from './rpg/tilemap';
import { Camera } from './rpg/camera';
import { Player } from './rpg/player';
import { InputHandler } from './rpg/input';
import { Enemy, EnemyDef } from './rpg/enemy';
import { Collectible, CollectibleDef } from './rpg/collectible';
import { DialogueTrigger, DialogueDef } from './rpg/dialogue';
import { ParticleSystem, ScreenShake, FloatingTextSystem } from './rpg/particles';

// ─── Demo Map Data ───
const DEMO_MAP: TilemapData = {
  width: 25,
  height: 18,
  tileWidth: 32,
  tileHeight: 32,
  layers: [
    {
      name: 'ground',
      data: [
        2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
        2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
      ],
      width: 25,
      height: 18,
      visible: true,
      opacity: 1,
    },
    {
      name: 'collision',
      data: [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,
        1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,
        1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,1,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,
        1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,0,0,1,
        1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      ],
      width: 25,
      height: 18,
      visible: false,
      opacity: 1,
    },
    {
      name: 'decor',
      data: [
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      ],
      width: 25,
      height: 18,
      visible: true,
      opacity: 1,
    },
  ],
  tilesets: [{
    name: 'main',
    tileWidth: 32,
    tileHeight: 32,
    columns: 4,
    tileCount: 5,
    palette: {
      1: '#5c4033',
      2: '#3d5c3d',
      3: '#228b22',
      4: '#ffd700',
    },
  }],
};

// ─── Game Entities ───
const ENEMIES: EnemyDef[] = [
  {
    id: 'slime-1', x: 300, y: 150, type: 'slime',
    patrolPoints: [{ x: 300, y: 150 }, { x: 450, y: 150 }, { x: 450, y: 250 }, { x: 300, y: 250 }],
    aggroRange: 90, speed: 40, hp: 25, damage: 8,
  },
  {
    id: 'slime-2', x: 550, y: 350, type: 'slime',
    patrolPoints: [{ x: 550, y: 350 }, { x: 650, y: 350 }],
    aggroRange: 80, speed: 35, hp: 20, damage: 6,
  },
  {
    id: 'wisp-1', x: 200, y: 400, type: 'wisp',
    patrolPoints: [{ x: 200, y: 400 }, { x: 200, y: 480 }],
    aggroRange: 110, speed: 30, hp: 15, damage: 12,
  },
  {
    id: 'slime-3', x: 680, y: 150, type: 'slime',
    patrolPoints: [{ x: 680, y: 150 }, { x: 720, y: 200 }],
    aggroRange: 70, speed: 45, hp: 18, damage: 5,
  },
];

const COLLECTIBLES: CollectibleDef[] = [
  { id: 'gold-1', x: 100, y: 100, type: 'gold', name: 'Gold Coins', value: 50 },
  { id: 'gold-2', x: 600, y: 200, type: 'gold', name: 'Gold Coins', value: 30 },
  { id: 'gold-3', x: 700, y: 480, type: 'gold', name: 'Gold Coins', value: 25 },
  { id: 'rune-1', x: 350, y: 80, type: 'rune', name: 'Fire Rune', subtype: 'fire', value: 100 },
  { id: 'rune-2', x: 180, y: 300, type: 'rune', name: 'Water Rune', subtype: 'water', value: 100 },
  { id: 'rune-3', x: 700, y: 100, type: 'rune', name: 'Earth Rune', subtype: 'earth', value: 100 },
  { id: 'potion-1', x: 700, y: 450, type: 'potion', name: 'Health Potion', subtype: 'hp', value: 30 },
  { id: 'potion-2', x: 120, y: 480, type: 'potion', name: 'Health Potion', subtype: 'hp', value: 30 },
];

const DIALOGUES: DialogueDef[] = [
  {
    id: 'sign-start', x: 64, y: 64, width: 32, height: 32, trigger: 'proximity', once: false,
    speaker: 'Guide',
    lines: [
      '⚔️ DEFEAT all enemies to win!',
      'Move: WASD or Arrow keys',
      'Attack: SPACE or J',
    ],
  },
];

// ─── Game State ───
type GameState = 'playing' | 'won' | 'lost' | 'paused';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tilemap: TilemapEngine;
  private camera: Camera;
  private player: Player;
  private input: InputHandler;
  private enemies: Enemy[];
  private collectibles: Collectible[];
  private dialogues: DialogueTrigger[];
  private activeDialogue: DialogueTrigger | null = null;

  // Juice systems
  private particles: ParticleSystem;
  private screenShake: ScreenShake;
  private floatingText: FloatingTextSystem;

  private lastTime = 0;
  private running = false;
  private fps = 60;
  private frameCount = 0;
  private fpsTime = 0;

  private gameState: GameState = 'playing';
  private shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private goalText: string = 'Defeat all enemies!';
  private winCondition: number = ENEMIES.length; // Kill all enemies to win
  private hitThisSwing: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.ctx = ctx;

    // Initialize juice systems
    this.particles = new ParticleSystem();
    this.screenShake = new ScreenShake();
    this.floatingText = new FloatingTextSystem();

    this.tilemap = new TilemapEngine(DEMO_MAP);
    this.camera = new Camera();
    this.camera.setBounds(0, 0, this.tilemap.pixelWidth, this.tilemap.pixelHeight);
    this.player = new Player(128, 128);
    this.player.particles = this.particles;
    this.input = new InputHandler();

    this.enemies = ENEMIES.map(e => {
      const enemy = new Enemy(e);
      enemy.particles = this.particles;
      enemy.screenShake = this.screenShake;
      enemy.floatingText = this.floatingText;
      return enemy;
    });

    this.collectibles = COLLECTIBLES.map(c => new Collectible(c));
    this.dialogues = DIALOGUES.map(d => new DialogueTrigger(d));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.input.attach();
    this.resize();
    window.addEventListener('resize', this.resize);
    this.camera.snapTo(this.player.centerX, this.player.centerY);
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    this.input.detach();
    window.removeEventListener('resize', this.resize);
  }

  private resize = (): void => {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      this.camera.setViewport(this.canvas.width, this.canvas.height);
    }
  };

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const keys = this.input.getState();

    // Handle game over states
    if (this.gameState === 'won' || this.gameState === 'lost') {
      if (keys['r'] || keys['enter']) {
        this.restart();
      }
      return;
    }

    // If dialogue active
    if (this.activeDialogue) {
      this.activeDialogue.update(dt);
      if (keys['enter'] || keys[' '] || keys['e']) {
        keys['enter'] = keys[' '] = keys['e'] = false;
        if (!this.activeDialogue.advance()) {
          this.activeDialogue = null;
        }
      }
      return;
    }

    // Normal gameplay
    this.player.update(keys, dt, this.tilemap);
    this.camera.follow(this.player.centerX, this.player.centerY);
    this.camera.update();

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this.tilemap, this.player);
    }

    // Player attack vs enemies (each enemy hit once per swing)
    const attackBox = this.player.getAttackBox();
    if (!attackBox) {
      this.hitThisSwing.clear();
    }
    if (attackBox) {
      for (const enemy of this.enemies) {
        if (enemy.alive && !enemy.isDying && !this.hitThisSwing.has(enemy.id) && this.boxOverlap(attackBox, enemy)) {
          this.hitThisSwing.add(enemy.id);
          // Calculate knockback direction
          const dx = enemy.centerX - this.player.centerX;
          const dy = enemy.centerY - this.player.centerY;
          const dist = Math.hypot(dx, dy) || 1;
          const knockbackStrength = 150;
          
          enemy.takeDamage(
            this.player.stats.attack,
            (dx / dist) * knockbackStrength,
            (dy / dist) * knockbackStrength
          );
          
          // Screen shake on hit
          this.screenShake.shake(3, 0.1);
          
          // Hit particles
          this.particles.burst(enemy.centerX, enemy.centerY, 6, '#fff', { size: 3, life: 0.3 });
          
          if (enemy.isDying) {
            this.player.enemiesDefeated++;
            this.player.score += 50;
            this.floatingText.add('+50', enemy.centerX, enemy.centerY - 20, '#ffd700', 14);
          }
        }
      }
    }

    // Enemy attack vs player
    for (const enemy of this.enemies) {
      if (enemy.canAttack() && enemy.overlaps(this.player.x, this.player.y, this.player.width, this.player.height)) {
        this.player.takeDamage(enemy.attackDamage);
        enemy.performAttack();
        
        // Screen shake on player hit
        this.screenShake.shake(6, 0.25);
        
        // Hit particles
        this.particles.burst(this.player.centerX, this.player.centerY, 10, '#ff4444');
        
        this.floatingText.add(`-${enemy.attackDamage}`, this.player.centerX, this.player.y - 10, '#ff4444', 16);
      }
    }

    // Check collectible pickups
    for (const item of this.collectibles) {
      if (item.checkPickup(this.player)) {
        const msg = item.pickup(this.player);
        this.player.score += item.value;
        
        // Pickup particles
        const color = item.type === 'rune' ? '#a855f7' : 
                      item.type === 'gold' ? '#fbbf24' : '#4ade80';
        this.particles.sparkle(item.centerX, item.centerY, 12, color);
        this.floatingText.add(msg, item.centerX, item.centerY, color, 12);
      }
    }

    // Check dialogue triggers
    for (const dlg of this.dialogues) {
      if (dlg.trigger === 'proximity' && dlg.containsPoint(this.player.centerX, this.player.centerY)) {
        if (!dlg.triggered || !dlg.once) {
          dlg.activate();
          this.activeDialogue = dlg;
        }
      }
      dlg.update(dt);
    }

    // Update juice systems
    this.particles.update(dt);
    this.shakeOffset = this.screenShake.update(dt);
    this.floatingText.update(dt);

    // Check win/lose conditions
    const aliveEnemies = this.enemies.filter(e => e.alive).length;
    if (aliveEnemies === 0 && this.gameState === 'playing') {
      this.gameState = 'won';
    }
    if (this.player.stats.hp <= 0 && this.gameState === 'playing') {
      this.gameState = 'lost';
    }
  }

  private boxOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private restart(): void {
    this.player = new Player(128, 128);
    this.player.particles = this.particles;
    
    this.enemies = ENEMIES.map(e => {
      const enemy = new Enemy(e);
      enemy.particles = this.particles;
      enemy.screenShake = this.screenShake;
      enemy.floatingText = this.floatingText;
      return enemy;
    });
    
    this.collectibles = COLLECTIBLES.map(c => new Collectible(c));
    this.activeDialogue = null;
    this.gameState = 'playing';
    this.hitThisSwing.clear();
    this.camera.snapTo(this.player.centerX, this.player.centerY);
  }

  private render(): void {
    const { ctx, canvas, camera, tilemap, player, enemies, collectibles, dialogues } = this;
    const { width: vw, height: vh } = canvas;

    // Apply screen shake
    const shake = this.shakeOffset || { x: 0, y: 0 };
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-10, -10, vw + 20, vh + 20);

    // Tilemap
    tilemap.render(ctx, camera.x, camera.y, vw, vh);
    this.renderDecor();

    // Collectibles
    for (const item of collectibles) {
      item.render(ctx, camera.x, camera.y);
    }

    // Dialogue indicators
    for (const dlg of dialogues) {
      dlg.renderIndicator(ctx, camera.x, camera.y);
    }

    // Enemies
    for (const enemy of enemies) {
      enemy.render(ctx, camera.x, camera.y);
    }

    // Player
    player.render(ctx, camera.x, camera.y);

    // Particles
    this.particles.render(ctx, camera.x, camera.y);

    // Floating text
    this.floatingText.render(ctx, camera.x, camera.y);

    ctx.restore();

    // UI - Goal banner
    this.renderGoalBanner(vw);

    // Player HUD
    player.renderHUD(ctx, vw);

    // Enemy counter
    this.renderEnemyCounter(vw);

    // FPS
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(vw - 70, 10, 60, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('FPS: ' + this.fps, vw - 60, 26);

    // Controls hint
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, vh - 34, 280, 24);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.fillText('WASD: Move | SPACE/J: Attack | R: Restart', 16, vh - 18);

    // Dialogue box
    if (this.activeDialogue) {
      this.activeDialogue.render(ctx, vw, vh);
    }

    // Game over screens
    if (this.gameState === 'won') {
      this.renderGameOver(vw, vh, true);
    } else if (this.gameState === 'lost') {
      this.renderGameOver(vw, vh, false);
    }
  }

  private renderGoalBanner(vw: number): void {
    const aliveEnemies = this.enemies.filter(e => e.alive).length;
    const bannerText = aliveEnemies > 0 ? `⚔️ Enemies: ${aliveEnemies}` : '🎉 All Clear!';
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const textWidth = ctx.measureText(bannerText).width + 30;
    ctx.fillRect(vw / 2 - textWidth / 2, 8, textWidth, 28);
    
    ctx.fillStyle = aliveEnemies > 0 ? '#fbbf24' : '#4ade80';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bannerText, vw / 2, 27);
    ctx.textAlign = 'left';
  }

  private renderEnemyCounter(vw: number): void {
    const alive = this.enemies.filter(e => e.alive).length;
    const total = this.enemies.length;
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(vw - 140, 40, 130, 40);
    
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Enemies Left:', vw - 130, 56);
    
    ctx.fillStyle = alive > 0 ? '#ef4444' : '#4ade80';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${alive} / ${total}`, vw - 130, 72);
  }

  private renderGameOver(vw: number, vh: number, won: boolean): void {
    // Darken background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, vw, vh);

    // Panel
    const panelW = 320;
    const panelH = 200;
    const panelX = (vw - panelW) / 2;
    const panelY = (vh - panelH) / 2;

    ctx.fillStyle = won ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = won ? '#4ade80' : '#f87171';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(won ? '🎉 VICTORY!' : '💀 DEFEATED', vw / 2, panelY + 50);

    // Stats
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`Score: ${this.player.score}`, vw / 2, panelY + 90);
    ctx.fillText(`Enemies Defeated: ${this.player.enemiesDefeated}`, vw / 2, panelY + 115);
    ctx.fillText(`Runes Collected: ${this.player.runes.length}`, vw / 2, panelY + 140);

    // Restart hint
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px monospace';
    ctx.fillText('Press R or Enter to play again', vw / 2, panelY + 175);

    ctx.textAlign = 'left';
  }

  private renderDecor(): void {
    const { ctx, tilemap, camera } = this;
    const decorLayer = (tilemap as any).data.layers.find((l: any) => l.name === 'decor');
    if (!decorLayer) return;

    for (let row = 0; row < decorLayer.height; row++) {
      for (let col = 0; col < decorLayer.width; col++) {
        const tileId = decorLayer.data[row * decorLayer.width + col];
        if (tileId === 0) continue;
        const px = col * tilemap.tileWidth - camera.x;
        const py = row * tilemap.tileHeight - camera.y;
        if (tileId === 3) {
          // Tree
          ctx.fillStyle = '#2d5016';
          ctx.beginPath();
          ctx.moveTo(px + 16, py + 4);
          ctx.lineTo(px + 28, py + 28);
          ctx.lineTo(px + 4, py + 28);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#4a2c0a';
          ctx.fillRect(px + 13, py + 24, 6, 8);
        }
      }
    }
  }
}

export function createGame(canvas: HTMLCanvasElement): Game {
  return new Game(canvas);
}

export function update(_dt: number): void {}
export function render(_ctx: CanvasRenderingContext2D): void {}
