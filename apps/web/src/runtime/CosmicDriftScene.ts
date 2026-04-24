/**
 * CosmicDriftScene — Space Shooter Demo
 * Showcases Phaser 4 features:
 * - Particle emitters (engine trail, explosions, starfield)
 * - Sprite rotation & scale tweens
 * - Alpha blending & color tinting
 * - Camera shake on damage
 * - Procedural starfield background
 * - Tween chains for animations
 */
import { Scene, GameObjects, Math as PhaserMath, Input as PhaserInput } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

interface Bullet { sprite: GameObjects.Rectangle; vy: number; alive: boolean; }
interface Asteroid { sprite: GameObjects.Rectangle; vx: number; vy: number; rot: number; hp: number; alive: boolean; size: number; }
interface Particle { gfx: GameObjects.Arc; vx: number; vy: number; life: number; maxLife: number; decay: number; }
interface Star { gfx: GameObjects.Arc; speed: number; }

export class CosmicDriftScene extends ClawgamePhaserScene {
  private player!: GameObjects.Rectangle;
  private playerVx = 0;
  private playerVy = 0;
  private playerHp = 100;
  private score = 0;
  private wave = 0;
  private waveTimer = -1;

  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private trailParticles: Particle[] = [];

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private shootCooldown = 0;
  private worldW = 800;
  private worldH = 600;

  // UI
  private hpBar!: GameObjects.Rectangle;
  private hpBarBg!: GameObjects.Rectangle;
  private scoreText!: GameObjects.Text;
  private waveText!: GameObjects.Text;
  private messageText!: GameObjects.Text;
  private messageTimer = 0;

  constructor() { super('cosmic-drift'); }

  create(): void {
    if (!this.bootstrap) return;
    this.worldW = this.bootstrap.bounds?.width ?? 800;
    this.worldH = this.bootstrap.bounds?.height ?? 600;
    this.cameras?.main?.setBackgroundColor('#050510');

    // Input
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']) {
        this.keys[k] = kb.addKey(k);
      }
    }

    // Starfield (3 layers for parallax)
    this.createStarfield();

    // Player ship
    this.player = this.add.rectangle(this.worldW / 2, this.worldH - 80, 28, 32, 0x00ffcc);
    this.player.setStrokeStyle(1, 0x00ffcc, 0.6);
    this.player.setDepth(10);
    // Engine glow
    const glow = this.add.circle(this.worldW / 2, this.worldH - 60, 10, 0x00ffcc, 0.15).setDepth(9);
    this.tweens?.add({ targets: glow, scaleX: 1.8, scaleY: 1.8, alpha: 0.05, duration: 600, yoyo: true, repeat: -1 });

    // UI
    this.hpBarBg = this.add.rectangle(70, 20, 120, 10, 0x1e1e2e).setDepth(50).setScrollFactor(0);
    this.hpBar = this.add.rectangle(70, 20, 120, 10, 0x22c55e).setDepth(51).setScrollFactor(0);
    this.scoreText = this.add.text(14, 32, 'Score: 0', { fontSize: '12px', color: '#00ffcc', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.waveText = this.add.text(this.worldW - 14, 16, 'Wave 0', { fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace' }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);
    this.messageText = this.add.text(this.worldW / 2, this.worldH / 2, '', { fontSize: '20px', color: '#00ffcc', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setVisible(false);

    // Nebula glow blobs for atmosphere
    const nebulaColors = [0x1a0030, 0x001a30, 0x0a0020, 0x000033];
    for (let i = 0; i < 6; i++) {
      const nx = Math.random() * this.worldW;
      const ny = Math.random() * this.worldH;
      const nr = 60 + Math.random() * 100;
      this.add.circle(nx, ny, nr, nebulaColors[i % nebulaColors.length], 0.3).setDepth(0);
    }

    // Title
    this.add.text(this.worldW / 2, 30, 'COSMIC DRIFT', { fontSize: '10px', color: '#00ffcc44', fontFamily: 'monospace', letterSpacing: 4 }).setOrigin(0.5).setDepth(1);

    this.showMessage('ARROWS/WASD move • SPACE fire', 4000);
  }

  update(time: number, delta: number): void {
    if (!this.player || this.playerHp <= 0) return;
    const dt = delta / 1000;

    // ─── Player movement ───
    this.playerVx = 0;
    this.playerVy = 0;
    if (this.keys.LEFT?.isDown || this.keys.A?.isDown) this.playerVx = -1;
    if (this.keys.RIGHT?.isDown || this.keys.D?.isDown) this.playerVx = 1;
    if (this.keys.UP?.isDown || this.keys.W?.isDown) this.playerVy = -1;
    if (this.keys.DOWN?.isDown || this.keys.S?.isDown) this.playerVy = 1;

    const speed = 320;
    const len = Math.sqrt(this.playerVx ** 2 + this.playerVy ** 2);
    if (len > 0) {
      this.playerVx = (this.playerVx / len) * speed * dt;
      this.playerVy = (this.playerVy / len) * speed * dt;
    }
    this.player.x = PhaserMath.Clamp(this.player.x + this.playerVx, 20, this.worldW - 20);
    this.player.y = PhaserMath.Clamp(this.player.y + this.playerVy, 40, this.worldH - 20);

    // ─── Shooting ───
    this.shootCooldown -= delta;
    if (this.keys.SPACE?.isDown && this.shootCooldown <= 0) {
      this.shootCooldown = 150;
      this.spawnBullet(this.player.x, this.player.y - 20);
    }

    // ─── Engine trail particles ───
    if (len > 0 || this.keys.UP?.isDown || this.keys.W?.isDown) {
      this.spawnTrailParticle(this.player.x - 6, this.player.y + 18);
      this.spawnTrailParticle(this.player.x + 6, this.player.y + 18);
    }

    // ─── Waves ───
    this.waveTimer -= delta;
    if (this.waveTimer < 0 || (this.waveTimer <= 0 && this.asteroids.filter(a => a.alive).length === 0)) {
      this.wave++;
      this.spawnWave(this.wave);
      this.waveTimer = 3000;
    }

    // ─── Update bullets ───
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.sprite.y += b.vy * dt;
      if (b.sprite.y < -10) { b.alive = false; b.sprite.setVisible(false); }
    }

    // ─── Update asteroids ───
    for (const a of this.asteroids) {
      if (!a.alive) continue;
      a.sprite.x += a.vx * dt;
      a.sprite.y += a.vy * dt;
      a.sprite.angle += a.rot * dt * 60;

      // Wrap around
      if (a.sprite.x < -50) a.sprite.x = this.worldW + 50;
      if (a.sprite.x > this.worldW + 50) a.sprite.x = -50;
      if (a.sprite.y > this.worldH + 50) { a.alive = false; a.sprite.setVisible(false); }

      // Hit player?
      if (this.dist(a.sprite.x, a.sprite.y, this.player.x, this.player.y) < a.size + 14) {
        a.alive = false;
        a.sprite.setVisible(false);
        this.playerHit(15);
      }

      // Hit by bullet?
      for (const b of this.bullets) {
        if (!b.alive) continue;
        if (this.dist(a.sprite.x, a.sprite.y, b.sprite.x, b.sprite.y) < a.size + 6) {
          b.alive = false; b.sprite.setVisible(false);
          a.hp--;
          if (a.hp <= 0) {
            a.alive = false; a.sprite.setVisible(false);
            this.score += a.size > 20 ? 25 : 10;
            this.spawnExplosion(a.sprite.x, a.sprite.y, a.size);
          } else {
            // Flash white
            a.sprite.setFillStyle(0xffffff);
            this.time.delayedCall(60, () => { if (a.sprite && a.alive) a.sprite.setFillStyle(0xef4444); });
            this.spawnMiniExplosion(b.sprite.x, b.sprite.y);
          }
        }
      }
    }

    // ─── Update particles ───
    this.updateParticles(delta, this.particles);
    this.updateParticles(delta, this.trailParticles);

    // ─── Update stars ───
    for (const s of this.stars) {
      s.gfx.y += s.speed * dt;
      if (s.gfx.y > this.worldH + 5) { s.gfx.y = -5; s.gfx.x = Math.random() * this.worldW; }
    }

    // ─── UI ───
    this.hpBar.width = 120 * Math.max(0, this.playerHp / 100);
    this.hpBar.fillColor = this.playerHp > 50 ? 0x22c55e : this.playerHp > 25 ? 0xfbbf24 : 0xef4444;
    this.scoreText.setText(`Score: ${this.score}`);
    this.waveText.setText(`Wave ${this.wave}`);

    if (this.messageTimer > 0) {
      this.messageTimer -= delta;
      if (this.messageTimer <= 0 && this.messageText) this.messageText.setVisible(false);
    }
  }

  // ─── Starfield ───

  private createStarfield(): void {
    const layers = [
      { count: 60, size: 1, speed: 30, alpha: 0.3 },
      { count: 30, size: 1.5, speed: 60, alpha: 0.5 },
      { count: 15, size: 2, speed: 100, alpha: 0.8 },
    ];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const x = Math.random() * this.worldW;
        const y = Math.random() * this.worldH;
        const color = [0xffffff, 0xaaccff, 0xffccaa][Math.floor(Math.random() * 3)];
        const gfx = this.add.circle(x, y, layer.size, color, layer.alpha).setDepth(1);
        this.stars.push({ gfx, speed: layer.speed + Math.random() * 20 });
      }
    }
  }

  // ─── Bullets ───

  private spawnBullet(x: number, y: number): void {
    const sprite = this.add.rectangle(x, y, 3, 12, 0x00ffcc).setDepth(8);
    // Glow
    const glow = this.add.circle(x, y, 6, 0x00ffcc, 0.15).setDepth(7);
    this.tweens?.add({ targets: glow, y: y - 200, alpha: 0, duration: 600, onComplete: () => glow.destroy() });
    this.bullets.push({ sprite, vy: -500, alive: true });
  }

  // ─── Waves ───

  private spawnWave(waveNum: number): void {
    const count = 3 + waveNum * 2;
    for (let i = 0; i < count; i++) {
      const size = Math.random() < 0.3 ? 30 : 16;
      const x = 40 + Math.random() * (this.worldW - 80);
      const y = -20 - Math.random() * 80;
      const colors = [0xef4444, 0xf97316, 0xa855f7, 0xec4899];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const sprite = this.add.rectangle(x, y, size, size, color).setDepth(5);
      sprite.setStrokeStyle(1, color, 0.4);
      // Tumble rotation via tween for smooth visual
      this.tweens?.add({ targets: sprite, angle: 360, duration: 2000 + Math.random() * 3000, repeat: -1 });
      this.asteroids.push({
        sprite, vx: (Math.random() - 0.5) * 80,
        vy: 40 + Math.random() * 60 + waveNum * 8,
        rot: (Math.random() - 0.5) * 2,
        hp: size > 20 ? 3 : 1, alive: true, size: size / 2,
      });
    }
    this.showMessage(`Wave ${waveNum}`, 1500);
  }

  // ─── Particles ───

  private spawnExplosion(x: number, y: number, size: number): void {
    const count = 12 + Math.floor(size);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 120;
      const colors = [0xff6b35, 0xfbbf24, 0xef4444, 0xff0066];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const r = 2 + Math.random() * 3;
      const gfx = this.add.circle(x, y, r, color).setAlpha(0.9).setDepth(15);
      this.particles.push({
        gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 600 + Math.random() * 400, maxLife: 1000, decay: 0.97,
      });
    }
    // Flash ring
    const ring = this.add.circle(x, y, 4, 0xffffff, 0.6).setDepth(16);
    this.tweens?.add({
      targets: ring, scaleX: size * 0.3, scaleY: size * 0.3, alpha: 0,
      duration: 400, ease: 'Cubic.easeOut', onComplete: () => ring.destroy(),
    });
  }

  private spawnMiniExplosion(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const gfx = this.add.circle(x, y, 1.5, 0xfbbf24).setAlpha(0.8).setDepth(15);
      this.particles.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 200, maxLife: 200, decay: 0.95 });
    }
  }

  private spawnTrailParticle(x: number, y: number): void {
    const color = Math.random() < 0.5 ? 0x00ffcc : 0x0088ff;
    const gfx = this.add.circle(x + (Math.random() - 0.5) * 4, y, 2 + Math.random() * 2, color, 0.6).setDepth(9);
    this.trailParticles.push({
      gfx, vx: (Math.random() - 0.5) * 20, vy: 40 + Math.random() * 60,
      life: 300 + Math.random() * 200, maxLife: 500, decay: 0.96,
    });
  }

  private updateParticles(delta: number, list: Particle[]): void {
    const dt = delta / 1000;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= delta;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife) * 0.8;
      p.gfx.setScale(0.5 + (p.life / p.maxLife) * 0.5);
      if (p.life <= 0) { p.gfx.destroy(); list.splice(i, 1); }
    }
  }

  // ─── Player damage ───

  private playerHit(dmg: number): void {
    if (this.playerHp <= 0) return;
    this.playerHp -= dmg;
    // Camera shake — Phaser 4 feature
    this.cameras?.main?.shake(200, 0.01);
    // Flash player
    this.player.setFillStyle(0xff0000);
    this.time.delayedCall(100, () => { if (this.player) this.player.setFillStyle(0x00ffcc); });
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.spawnExplosion(this.player.x, this.player.y, 40);
      this.player.setVisible(false);
      this.showMessage(`GAME OVER — Score: ${this.score}`, 5000);
      this.time.delayedCall(4000, () => this.scene.restart());
    }
  }

  // ─── Helpers ───

  private showMessage(text: string, dur: number): void {
    if (!this.messageText) return;
    this.messageText.setText(text).setVisible(true).setAlpha(1);
    this.messageTimer = dur;
    this.tweens?.add({ targets: this.messageText, alpha: 0, delay: dur - 500, duration: 500 });
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
