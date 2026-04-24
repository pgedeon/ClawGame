/**
 * CosmicDriftScene — Complete Space Shooter
 * Arrow keys/WASD move, SPACE fire, P pause
 * Waves of asteroids, power-ups, bosses, weapon upgrades
 */
import { GameObjects, Math as PhaserMath, Input as PhaserInput } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

// ─── Types ───
interface Bullet { sprite: GameObjects.Rectangle; vx: number; vy: number; alive: boolean; isEnemy?: boolean; }
interface Asteroid { sprite: GameObjects.Rectangle; vx: number; vy: number; hp: number; maxHp: number; alive: boolean; size: number; rotSpeed: number; }
interface PowerUp { sprite: GameObjects.Arc; glow: GameObjects.Arc; type: 'shield' | 'rapid' | 'spread'; alive: boolean; }
interface Particle { gfx: GameObjects.Arc; vx: number; vy: number; life: number; maxLife: number; }
interface Star { gfx: GameObjects.Arc; speed: number; }
interface Boss { sprite: GameObjects.Rectangle; hp: number; maxHp: number; alive: boolean; phase: number; timer: number; fireTimer: number; hpBar: GameObjects.Rectangle; hpBg: GameObjects.Rectangle; }

type GameState = 'title' | 'playing' | 'gameover' | 'paused';
type WeaponLevel = 1 | 2 | 3 | 4;

// ─── Scene ───
export class CosmicDriftScene extends ClawgamePhaserScene {
  private player!: GameObjects.Rectangle;
  private playerGlow!: GameObjects.Arc;
  private shieldGlow!: GameObjects.Arc;
  private playerVx = 0;
  private playerVy = 0;
  private playerHp = 100;
  private score = 0;
  private highScore = 0;
  private wave = 0;
  private waveTimer = 0;
  private waveEnemiesAlive = 0;
  private waveActive = false;
  private state: GameState = 'title';
  private weaponLevel: WeaponLevel = 1;
  private hasShield = false;
  private hasRapid = false;
  private hasSpread = false;
  private rapidTimer = 0;
  private spreadTimer = 0;
  private invulnTimer = 0;

  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private boss: Boss | null = null;

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private shootCooldown = 0;
  private worldW = 800;
  private worldH = 600;

  // UI
  private hpBar!: GameObjects.Rectangle;
  private hpBg!: GameObjects.Rectangle;
  private scoreText!: GameObjects.Text;
  private waveText!: GameObjects.Text;
  private weaponText!: GameObjects.Text;
  private powerText!: GameObjects.Text;
  private titleGroup: GameObjects.Container | null = null;
  private gameOverGroup: GameObjects.Container | null = null;
  private pauseText: GameObjects.Text | null = null;

  constructor() { super('cosmic-drift'); }

  create(): void {
    if (!this.bootstrap) return;
    this.worldW = this.bootstrap.bounds?.width ?? 800;
    this.worldH = this.bootstrap.bounds?.height ?? 600;
    this.highScore = parseInt(localStorage.getItem('cosmic-drift-hs') || '0', 10);

    this.cameras?.main?.setBackgroundColor('#050510');
    this.createStarfield();
    this.createNebula();
    this.setupInput();
    this.showTitle();
  }

  update(time: number, delta: number): void {
    // Stars always scroll
    this.updateStars(delta);

    if (this.state === 'title') {
      if (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.hideTitle();
        this.startGame();
      }
      return;
    }

    if (this.state === 'paused') {
      if (PhaserInput.Keyboard.JustDown(this.keys.P)) this.resumeGame();
      return;
    }

    if (this.state === 'gameover') {
      if (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.hideGameOver();
        this.showTitle();
      }
      return;
    }

    // ─── Playing ───
    if (PhaserInput.Keyboard.JustDown(this.keys.P)) { this.pauseGame(); return; }
    const dt = delta / 1000;

    this.updatePlayer(dt);
    this.updateShooting(time, delta);
    this.updateWaves(delta);
    this.updateBullets(dt);
    this.updateAsteroids(dt, time);
    this.updateBoss(dt, time);
    this.updatePowerUps(dt);
    this.updatePowerTimers(delta);
    this.updateParticles(delta);
    this.updateUI();

    // Invulnerability flash
    if (this.invulnTimer > 0) {
      this.invulnTimer -= delta;
      this.player.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
    } else {
      this.player.setAlpha(1);
    }
  }

  // ─── Setup ───

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['W','A','S','D','UP','DOWN','LEFT','RIGHT','SPACE','ENTER','P']) {
        this.keys[k] = kb.addKey(k);
      }
    }
  }

  private createStarfield(): void {
    const layers = [
      { count: 80, size: 1, speed: 25, alpha: 0.25 },
      { count: 40, size: 1.5, speed: 55, alpha: 0.45 },
      { count: 20, size: 2.2, speed: 95, alpha: 0.75 },
    ];
    for (const l of layers) {
      for (let i = 0; i < l.count; i++) {
        const c = [0xffffff, 0xaaccff, 0xffccaa, 0xccffcc][Math.floor(Math.random() * 4)];
        const g = this.add.circle(Math.random() * this.worldW, Math.random() * this.worldH, l.size, c, l.alpha).setDepth(1);
        this.stars.push({ gfx: g, speed: l.speed + Math.random() * 20 });
      }
    }
  }

  private createNebula(): void {
    const colors = [0x1a0030, 0x001a30, 0x0a0020, 0x000033, 0x1a0030, 0x001133];
    for (let i = 0; i < 6; i++) {
      this.add.circle(Math.random() * this.worldW, Math.random() * this.worldH, 70 + Math.random() * 100, colors[i], 0.25).setDepth(0);
    }
  }

  // ─── Game States ───

  private showTitle(): void {
    this.state = 'title';
    this.titleGroup = this.add.container(this.worldW / 2, this.worldH / 2 - 40).setDepth(100);

    const title = this.add.text(0, -80, 'COSMIC DRIFT', { fontSize: '36px', color: '#00ffcc', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
    const sub = this.add.text(0, -40, 'A Phaser 4 Space Shooter', { fontSize: '14px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5);
    const start = this.add.text(0, 20, 'Press SPACE or ENTER to Start', { fontSize: '16px', color: '#e2e8f0', fontFamily: 'monospace' }).setOrigin(0.5);
    const controls = this.add.text(0, 60, 'ARROWS/WASD move • SPACE fire • P pause', { fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5);
    const hs = this.add.text(0, 100, `High Score: ${this.highScore}`, { fontSize: '13px', color: '#fbbf24', fontFamily: 'monospace' }).setOrigin(0.5);

    this.titleGroup.add([title, sub, start, controls, hs]);
    this.tweens?.add({ targets: start, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
  }

  private hideTitle(): void { this.titleGroup?.destroy(true); this.titleGroup = null; }

  private showGameOver(): void {
    this.state = 'gameover';
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('cosmic-drift-hs', String(this.highScore));
    }
    this.gameOverGroup = this.add.container(this.worldW / 2, this.worldH / 2).setDepth(100);
    const bg = this.add.rectangle(0, 0, 300, 180, 0x0f172a, 0.9).setStrokeStyle(1, 0x334155);
    const go = this.add.text(0, -60, 'GAME OVER', { fontSize: '28px', color: '#ef4444', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
    const sc = this.add.text(0, -20, `Score: ${this.score}`, { fontSize: '18px', color: '#e2e8f0', fontFamily: 'monospace' }).setOrigin(0.5);
    const hs = this.add.text(0, 10, `High Score: ${this.highScore}`, { fontSize: '14px', color: '#fbbf24', fontFamily: 'monospace' }).setOrigin(0.5);
    const wave = this.add.text(0, 35, `Reached Wave ${this.wave}`, { fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }).setOrigin(0.5);
    const restart = this.add.text(0, 65, 'Press SPACE to continue', { fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }).setOrigin(0.5);
    this.gameOverGroup.add([bg, go, sc, hs, wave, restart]);
    this.tweens?.add({ targets: restart, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
  }

  private hideGameOver(): void { this.gameOverGroup?.destroy(true); this.gameOverGroup = null; }

  private pauseGame(): void {
    this.state = 'paused';
    this.pauseText = this.add.text(this.worldW / 2, this.worldH / 2, '⏸ PAUSED\nPress P to resume', { fontSize: '20px', color: '#e2e8f0', fontFamily: 'monospace', align: 'center', backgroundColor: '#0f172acc', padding: { x: 24, y: 16 } }).setOrigin(0.5).setDepth(100);
  }

  private resumeGame(): void {
    this.state = 'playing';
    this.pauseText?.destroy();
    this.pauseText = null;
  }

  private startGame(): void {
    this.state = 'playing';
    this.playerHp = 100;
    this.score = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.waveActive = false;
    this.weaponLevel = 1;
    this.hasShield = false;
    this.hasRapid = false;
    this.hasSpread = false;
    this.rapidTimer = 0;
    this.spreadTimer = 0;
    this.invulnTimer = 0;
    this.bullets.forEach(b => b.sprite.destroy());
    this.asteroids.forEach(a => a.sprite.destroy());
    this.powerUps.forEach(p => { p.sprite.destroy(); p.glow.destroy(); });
    this.particles.forEach(p => p.gfx.destroy());
    if (this.boss) { this.boss.sprite.destroy(); this.boss.hpBar.destroy(); this.boss.hpBg.destroy(); }
    this.bullets = [];
    this.asteroids = [];
    this.powerUps = [];
    this.particles = [];
    this.boss = null;

    // Player
    this.player = this.add.rectangle(this.worldW / 2, this.worldH - 80, 28, 32, 0x00ffcc).setDepth(10);
    this.player.setStrokeStyle(1, 0x00ffcc, 0.5);
    this.playerGlow = this.add.circle(this.worldW / 2, this.worldH - 80, 18, 0x00ffcc, 0.08).setDepth(9);
    this.shieldGlow = this.add.circle(this.worldW / 2, this.worldH - 80, 24, 0x3b82f6, 0).setDepth(9).setStrokeStyle(2, 0x3b82f6, 0);
    this.tweens?.add({ targets: this.playerGlow, scaleX: 1.5, scaleY: 1.5, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });

    // HUD
    this.hpBg = this.add.rectangle(70, 20, 124, 14, 0x1e1e2e).setDepth(50).setScrollFactor(0);
    this.hpBar = this.add.rectangle(70, 20, 120, 10, 0x22c55e).setDepth(51).setScrollFactor(0);
    this.scoreText = this.add.text(14, 34, 'Score: 0', { fontSize: '12px', color: '#00ffcc', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.waveText = this.add.text(this.worldW - 14, 14, 'Wave 0', { fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);
    this.weaponText = this.add.text(14, 50, 'Weapon: I', { fontSize: '11px', color: '#f59e0b', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.powerText = this.add.text(this.worldW - 14, 34, '', { fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);
  }

  // ─── Player ───

  private updatePlayer(dt: number): void {
    if (!this.player || this.playerHp <= 0) return;

    let ax = 0, ay = 0;
    if (this.keys.LEFT?.isDown || this.keys.A?.isDown) ax = -1;
    if (this.keys.RIGHT?.isDown || this.keys.D?.isDown) ax = 1;
    if (this.keys.UP?.isDown || this.keys.W?.isDown) ay = -1;
    if (this.keys.DOWN?.isDown || this.keys.S?.isDown) ay = 1;

    // Acceleration-based movement
    const accel = 1800;
    const friction = 0.88;
    this.playerVx += ax * accel * dt;
    this.playerVy += ay * accel * dt;
    this.playerVx *= friction;
    this.playerVy *= friction;

    const maxSpeed = 350;
    const speed = Math.sqrt(this.playerVx ** 2 + this.playerVy ** 2);
    if (speed > maxSpeed) { this.playerVx *= maxSpeed / speed; this.playerVy *= maxSpeed / speed; }

    this.player.x = PhaserMath.Clamp(this.player.x + this.playerVx * dt, 20, this.worldW - 20);
    this.player.y = PhaserMath.Clamp(this.player.y + this.playerVy * dt, 20, this.worldH - 20);

    // Visual tilt
    this.player.angle = PhaserMath.Clamp(this.playerVx * 0.03, -15, 15);

    // Update glows
    this.playerGlow?.setPosition(this.player.x, this.player.y);
    this.shieldGlow?.setPosition(this.player.x, this.player.y);
    this.shieldGlow?.setAlpha(this.hasShield ? 0.15 : 0);
    this.shieldGlow?.setStrokeStyle(2, 0x3b82f6, this.hasShield ? 0.6 : 0);
  }

  // ─── Shooting ───

  private updateShooting(time: number, delta: number): void {
    if (!this.player) return;
    this.shootCooldown -= delta;
    const cd = this.hasRapid ? 80 : 150;
    if (this.keys.SPACE?.isDown && this.shootCooldown <= 0) {
      this.shootCooldown = cd;
      this.fireWeapon();
    }
  }

  private fireWeapon(): void {
    const px = this.player.x, py = this.player.y - 18;
    const lvl = this.weaponLevel;
    const color = lvl >= 4 ? 0xfbbf24 : lvl >= 3 ? 0xa78bfa : lvl >= 2 ? 0x22c55e : 0x00ffcc;

    if (lvl === 1) {
      this.spawnBullet(px, py, 0, -500, color);
    } else if (lvl === 2) {
      this.spawnBullet(px - 6, py, 0, -500, color);
      this.spawnBullet(px + 6, py, 0, -500, color);
    } else if (lvl === 3 && !this.hasSpread) {
      this.spawnBullet(px, py, 0, -520, color);
      this.spawnBullet(px - 10, py + 4, -40, -480, color);
      this.spawnBullet(px + 10, py + 4, 40, -480, color);
    } else {
      // Level 4 or spread active
      this.spawnBullet(px, py, 0, -540, color);
      this.spawnBullet(px - 8, py + 2, -30, -500, color);
      this.spawnBullet(px + 8, py + 2, 30, -500, color);
      this.spawnBullet(px - 16, py + 6, -70, -440, color);
      this.spawnBullet(px + 16, py + 6, 70, -440, color);
    }
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, color: number): void {
    const sprite = this.add.rectangle(x, y, 3, 10, color).setDepth(8);
    this.bullets.push({ sprite, vx, vy, alive: true });
    // Tiny glow
    const g = this.add.circle(x, y, 5, color, 0.12).setDepth(7);
    this.tweens?.add({ targets: g, y: y + vy * 0.5, alpha: 0, duration: 300, onComplete: () => g.destroy() });
  }

  // ─── Waves ───

  private updateWaves(delta: number): void {
    if (this.state !== 'playing') return;

    const aliveCount = this.asteroids.filter(a => a.alive).length + (this.boss?.alive ? 1 : 0);

    if (!this.waveActive && aliveCount === 0) {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.spawnWave(this.wave);
        this.waveActive = true;
        // Wave announcement
        const txt = this.add.text(this.worldW / 2, this.worldH / 3, `WAVE ${this.wave}`, { fontSize: '24px', color: '#a78bfa', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setDepth(60);
        this.tweens?.add({ targets: txt, alpha: 0, y: txt.y - 30, duration: 1500, onComplete: () => txt.destroy() });
      }
    }

    if (this.waveActive && aliveCount === 0 && this.asteroids.length === 0 && !this.boss) {
      this.waveActive = false;
      this.waveTimer = 2000;
      // Weapon upgrade every 3 waves
      if (this.wave % 3 === 0 && this.weaponLevel < 4) {
        this.weaponLevel = (Math.min(4, this.weaponLevel + 1)) as WeaponLevel;
        const wNames = ['', 'I', 'II', 'III', 'IV'];
        const msg = this.add.text(this.worldW / 2, this.worldH / 2 + 40, `Weapon Upgrade: ${wNames[this.weaponLevel]}`, { fontSize: '14px', color: '#f59e0b', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(60);
        this.tweens?.add({ targets: msg, alpha: 0, duration: 2000, onComplete: () => msg.destroy() });
      }
    }
  }

  private spawnWave(waveNum: number): void {
    // Boss every 5 waves
    if (waveNum % 5 === 0) {
      this.spawnBoss(waveNum);
      return;
    }

    const difficulty = Math.min(waveNum, 20);
    const smallCount = 2 + Math.floor(difficulty * 1.2);
    const medCount = Math.floor(difficulty * 0.5);
    const largeCount = Math.floor(difficulty * 0.2);

    for (let i = 0; i < smallCount; i++) this.spawnAsteroid('small', waveNum);
    for (let i = 0; i < medCount; i++) this.spawnAsteroid('medium', waveNum);
    for (let i = 0; i < largeCount; i++) this.spawnAsteroid('large', waveNum);
  }

  private spawnAsteroid(size: 'small' | 'medium' | 'large', waveNum: number): void {
    const specs = {
      small: { w: 12, h: 12, hp: 1, score: 10, speed: 1.3, colors: [0xef4444, 0xf97316, 0xfb923c] },
      medium: { w: 22, h: 22, hp: 2, score: 25, speed: 1.0, colors: [0xa855f7, 0x8b5cf6, 0xc084fc] },
      large: { w: 36, h: 36, hp: 4, score: 50, speed: 0.7, colors: [0xec4899, 0xf472b6, 0xbe185d] },
    };
    const s = specs[size];
    const color = s.colors[Math.floor(Math.random() * s.colors.length)];
    const x = 30 + Math.random() * (this.worldW - 60);
    const y = -20 - Math.random() * 100;
    const baseSpeed = 50 + waveNum * 5;
    const sprite = this.add.rectangle(x, y, s.w, s.h, color).setDepth(5);
    sprite.setStrokeStyle(1, color, 0.3);

    this.asteroids.push({
      sprite, vx: (Math.random() - 0.5) * 80,
      vy: baseSpeed * s.speed + Math.random() * 40,
      hp: s.hp + Math.floor(waveNum / 8), maxHp: s.hp + Math.floor(waveNum / 8),
      alive: true, size: s.w / 2, rotSpeed: (Math.random() - 0.5) * 4,
    });
  }

  // ─── Boss ───

  private spawnBoss(waveNum: number): void {
    const x = this.worldW / 2;
    const y = -60;
    const color = 0xff0066;
    const sprite = this.add.rectangle(x, y, 80, 50, color).setDepth(6);
    sprite.setStrokeStyle(2, 0xff3388, 0.6);

    const hpBg = this.add.rectangle(x, y - 35, 84, 8, 0x1e1e2e).setDepth(7);
    const hpBar = this.add.rectangle(x, y - 35, 80, 4, 0xff0066).setDepth(7);

    const maxHp = 30 + waveNum * 10;
    this.boss = { sprite, hp: maxHp, maxHp, alive: true, phase: 0, timer: 0, fireTimer: 0, hpBar, hpBg };

    // Move boss into position
    this.tweens?.add({ targets: sprite, y: 80, duration: 1500, ease: 'Cubic.easeOut' });
    this.tweens?.add({ targets: hpBg, y: 80 - 35, duration: 1500, ease: 'Cubic.easeOut' });
    this.tweens?.add({ targets: hpBar, y: 80 - 35, duration: 1500, ease: 'Cubic.easeOut' });

    // Warning text
    const warn = this.add.text(this.worldW / 2, this.worldH / 3, '⚠ BOSS ⚠', { fontSize: '28px', color: '#ff0066', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setDepth(60);
    this.tweens?.add({ targets: warn, alpha: 0, duration: 2000, onComplete: () => warn.destroy() });
  }

  private updateBoss(dt: number, time: number): void {
    if (!this.boss || !this.boss.alive) return;
    const b = this.boss;

    // Movement: sine wave pattern
    b.timer += dt;
    const targetX = this.worldW / 2 + Math.sin(b.timer * 0.8) * (this.worldW / 3);
    const targetY = 80 + Math.sin(b.timer * 0.4) * 40;
    b.sprite.x += (targetX - b.sprite.x) * 2 * dt;
    b.sprite.y += (targetY - b.sprite.y) * 2 * dt;
    b.hpBg.setPosition(b.sprite.x, b.sprite.y - 35);
    b.hpBar.setPosition(b.sprite.x - (80 * (1 - b.hp / b.maxHp)) / 2, b.sprite.y - 35);
    b.hpBar.width = 80 * (b.hp / b.maxHp);

    // Boss fires at player
    b.fireTimer -= dt * 1000;
    if (b.fireTimer <= 0 && this.player) {
      b.fireTimer = 800 - Math.min(this.wave * 20, 400);
      const angle = Math.atan2(this.player.y - b.sprite.y, this.player.x - b.sprite.x);
      const bSprite = this.add.rectangle(b.sprite.x, b.sprite.y + 30, 5, 5, 0xff3388).setDepth(8);
      this.bullets.push({ sprite: bSprite, vx: Math.cos(angle) * 250, vy: Math.sin(angle) * 250, alive: true, isEnemy: true });
    }

    // Hit by player bullets
    for (const bul of this.bullets) {
      if (!bul.alive || bul.isEnemy) continue;
      if (this.dist(b.sprite.x, b.sprite.y, bul.sprite.x, bul.sprite.y) < 50) {
        bul.alive = false; bul.sprite.setVisible(false);
        b.hp--;
        b.sprite.setFillStyle(0xffffff);
        this.time.delayedCall(50, () => { if (b.sprite && b.alive) b.sprite.setFillStyle(0xff0066); });
        this.spawnMiniExplosion(bul.sprite.x, bul.sprite.y);
        if (b.hp <= 0) {
          this.killBoss();
        }
      }
    }
  }

  private killBoss(): void {
    if (!this.boss) return;
    const b = this.boss;
    b.alive = false;
    this.score += 200 + this.wave * 50;
    this.spawnExplosion(b.sprite.x, b.sprite.y, 60);
    this.spawnExplosion(b.sprite.x - 20, b.sprite.y + 10, 40);
    this.spawnExplosion(b.sprite.x + 20, b.sprite.y - 10, 40);
    this.cameras?.main?.shake(400, 0.015);
    b.sprite.destroy();
    b.hpBar.destroy();
    b.hpBg.destroy();
    this.boss = null;
  }

  // ─── Update Loops ───

  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.sprite.x += (b.vx ?? 0) * dt;
      b.sprite.y += b.vy * dt;
      if (b.sprite.y < -10 || b.sprite.y > this.worldH + 10 || b.sprite.x < -10 || b.sprite.x > this.worldW + 10) {
        b.alive = false; b.sprite.setVisible(false);
      }

      // Enemy bullets hit player
      if (b.isEnemy && this.player && this.playerHp > 0) {
        if (this.dist(b.sprite.x, b.sprite.y, this.player.x, this.player.y) < 18) {
          b.alive = false; b.sprite.setVisible(false);
          this.playerHit(10);
        }
      }
    }
  }

  private updateAsteroids(dt: number, time: number): void {
    for (const a of this.asteroids) {
      if (!a.alive) continue;
      a.sprite.x += a.vx * dt;
      a.sprite.y += a.vy * dt;
      a.sprite.angle += a.rotSpeed * dt * 60;

      // Wrap horizontal
      if (a.sprite.x < -40) a.sprite.x = this.worldW + 40;
      if (a.sprite.x > this.worldW + 40) a.sprite.x = -40;

      // Off bottom
      if (a.sprite.y > this.worldH + 40) { a.alive = false; a.sprite.setVisible(false); continue; }

      // Hit by player bullet
      for (const b of this.bullets) {
        if (!b.alive || b.isEnemy) continue;
        if (this.dist(a.sprite.x, a.sprite.y, b.sprite.x, b.sprite.y) < a.size + 6) {
          b.alive = false; b.sprite.setVisible(false);
          a.hp--;
          if (a.hp <= 0) {
            this.killAsteroid(a);
          } else {
            a.sprite.setFillStyle(0xffffff);
            this.time.delayedCall(60, () => { if (a.sprite && a.alive) a.sprite.setFillStyle(0xef4444); });
            this.spawnMiniExplosion(b.sprite.x, b.sprite.y);
          }
        }
      }

      // Hit player
      if (this.player && this.playerHp > 0 && this.dist(a.sprite.x, a.sprite.y, this.player.x, this.player.y) < a.size + 14) {
        if (this.invulnTimer <= 0) {
          a.alive = false; a.sprite.setVisible(false);
          this.playerHit(15 + Math.floor(a.size));
        }
      }
    }
  }

  private killAsteroid(a: Asteroid): void {
    a.alive = false; a.sprite.setVisible(false);
    const size = a.size * 2;
    const pts = size <= 14 ? 10 : size <= 24 ? 25 : 50;
    this.score += pts;
    this.spawnExplosion(a.sprite.x, a.sprite.y, size);

    // Large splits into 2 medium
    if (size >= 32) {
      for (let i = 0; i < 2; i++) {
        const childSprite = this.add.rectangle(a.sprite.x + (i === 0 ? -15 : 15), a.sprite.y, 22, 22, 0xa855f7).setDepth(5);
        childSprite.setStrokeStyle(1, 0xa855f7, 0.3);
        this.asteroids.push({
          sprite: childSprite, vx: (i === 0 ? -1 : 1) * (40 + Math.random() * 40),
          vy: a.vy * 0.8 + Math.random() * 20, hp: 2, maxHp: 2,
          alive: true, size: 11, rotSpeed: (Math.random() - 0.5) * 4,
        });
      }
    }

    // Power-up drop (10% chance from medium+, 5% from small)
    const dropChance = size >= 22 ? 0.10 : 0.05;
    if (Math.random() < dropChance) this.spawnPowerUp(a.sprite.x, a.sprite.y);
  }

  private updatePowerUps(dt: number): void {
    if (!this.player) return;
    for (const p of this.powerUps) {
      if (!p.alive) continue;
      // Float down slowly
      p.sprite.y += 30 * dt;
      p.glow.y = p.sprite.y;
      if (p.sprite.y > this.worldH + 20) { p.alive = false; p.sprite.setVisible(false); p.glow.setVisible(false); continue; }

      // Player pickup
      if (this.dist(p.sprite.x, p.sprite.y, this.player.x, this.player.y) < 22) {
        p.alive = false;
        this.tweens?.add({ targets: [p.sprite, p.glow], scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => { p.sprite.destroy(); p.glow.destroy(); } });
        this.activatePowerUp(p.type);
      }
    }
  }

  private spawnPowerUp(x: number, y: number): void {
    const types: Array<'shield' | 'rapid' | 'spread'> = ['shield', 'rapid', 'spread'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { shield: 0x3b82f6, rapid: 0xfbbf24, spread: 0xa855f7 };
    const color = colors[type];
    const glow = this.add.circle(x, y, 12, color, 0.12).setDepth(6);
    const sprite = this.add.circle(x, y, 6, color).setDepth(7);
    this.tweens?.add({ targets: glow, scaleX: 1.8, scaleY: 1.8, alpha: 0.05, duration: 600, yoyo: true, repeat: -1 });
    this.powerUps.push({ sprite, glow, type, alive: true });
  }

  private activatePowerUp(type: 'shield' | 'rapid' | 'spread'): void {
    if (type === 'shield') { this.hasShield = true; this.showMessage('🛡 Shield!', 1500); }
    if (type === 'rapid') { this.hasRapid = true; this.rapidTimer = 6000; this.showMessage('⚡ Rapid Fire!', 1500); }
    if (type === 'spread') { this.hasSpread = true; this.spreadTimer = 8000; this.showMessage('🌟 Spread Shot!', 1500); }
  }

  private updatePowerTimers(delta: number): void {
    if (this.rapidTimer > 0) { this.rapidTimer -= delta; if (this.rapidTimer <= 0) this.hasRapid = false; }
    if (this.spreadTimer > 0) { this.spreadTimer -= delta; if (this.spreadTimer <= 0) this.hasSpread = false; }
  }

  private updateStars(delta: number): void {
    const dt = delta / 1000;
    for (const s of this.stars) {
      s.gfx.y += s.speed * dt;
      if (s.gfx.y > this.worldH + 5) { s.gfx.y = -5; s.gfx.x = Math.random() * this.worldW; }
    }
  }

  private updateUI(): void {
    if (!this.hpBar) return;
    this.hpBar.width = 120 * Math.max(0, this.playerHp / 100);
    this.hpBar.fillColor = this.playerHp > 50 ? 0x22c55e : this.playerHp > 25 ? 0xfbbf24 : 0xef4444;
    this.scoreText.setText(`Score: ${this.score}`);
    this.waveText.setText(`Wave ${this.wave}`);
    const wNames = ['', 'I', 'II', 'III', 'IV'];
    this.weaponText.setText(`Weapon: ${wNames[this.weaponLevel]}${this.hasSpread ? ' ★' : ''}`);
    const powers: string[] = [];
    if (this.hasShield) powers.push('🛡');
    if (this.hasRapid) powers.push(`⚡${Math.ceil(this.rapidTimer / 1000)}s`);
    if (this.hasSpread) powers.push(`🌟${Math.ceil(this.spreadTimer / 1000)}s`);
    this.powerText.setText(powers.join(' '));
  }

  // ─── Player Damage ───

  private playerHit(dmg: number): void {
    if (this.playerHp <= 0 || this.invulnTimer > 0) return;

    if (this.hasShield) {
      this.hasShield = false;
      this.shieldGlow?.setAlpha(0);
      this.showMessage('Shield absorbed hit!', 1500);
      this.cameras?.main?.shake(150, 0.005);
      return;
    }

    this.playerHp -= dmg;
    this.cameras?.main?.shake(200, 0.01);
    this.invulnTimer = 1000;
    this.player.setFillStyle(0xff0000);
    this.time.delayedCall(100, () => { if (this.player) this.player.setFillStyle(0x00ffcc); });
    this.spawnMiniExplosion(this.player.x, this.player.y);

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.spawnExplosion(this.player.x, this.player.y, 50);
      this.player.setVisible(false);
      this.playerGlow?.setVisible(false);
      this.shieldGlow?.setVisible(false);
      this.time.delayedCall(1500, () => this.showGameOver());
    }
  }

  // ─── Particles ───

  private spawnExplosion(x: number, y: number, size: number): void {
    const count = 10 + Math.floor(size * 0.5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 50 + Math.random() * 120;
      const colors = [0xff6b35, 0xfbbf24, 0xef4444, 0xff0066, 0xf97316];
      const gfx = this.add.circle(x, y, 1.5 + Math.random() * 3, colors[Math.floor(Math.random() * 5)]).setAlpha(0.9).setDepth(15);
      this.particles.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 500 + Math.random() * 400, maxLife: 900 });
    }
    // Flash ring
    const ring = this.add.circle(x, y, 4, 0xffffff, 0.5).setDepth(16);
    this.tweens?.add({ targets: ring, scaleX: size * 0.25, scaleY: size * 0.25, alpha: 0, duration: 350, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  private spawnMiniExplosion(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const gfx = this.add.circle(x, y, 1.5, 0xfbbf24).setAlpha(0.7).setDepth(15);
      this.particles.push({ gfx, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, life: 200, maxLife: 200 });
    }
  }

  private updateParticles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife) * 0.8;
      p.gfx.setScale(0.4 + (p.life / p.maxLife) * 0.6);
      if (p.life <= 0) { p.gfx.destroy(); this.particles.splice(i, 1); }
    }
  }

  // ─── Helpers ───

  private showMessage(text: string, dur: number): void {
    const msg = this.add.text(this.worldW / 2, this.worldH / 2 + 80, text, { fontSize: '14px', color: '#e2e8f0', fontFamily: 'monospace', backgroundColor: '#0f172acc', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(60).setScrollFactor(0);
    this.tweens?.add({ targets: msg, alpha: 0, delay: dur, duration: 500, onComplete: () => msg.destroy() });
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
