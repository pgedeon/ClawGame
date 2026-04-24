/**
 * CosmicDriftScene — Complete Space Shooter
 *
 * Game states: TITLE → PLAYING → PAUSED → GAME_OVER
 * Wave system with 10 waves, boss every 5th, then loops with +difficulty.
 * Power-ups, progressive weapon upgrades, asteroids that split, boss fights.
 */
import { Scene, GameObjects, Math as PhaserMath, Input as PhaserInput } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

// ─── Interfaces ───

interface Bullet {
  sprite: GameObjects.Rectangle;
  vx: number;
  vy: number;
  alive: boolean;
}

type AsteroidSize = 'small' | 'medium' | 'large';

interface Asteroid {
  sprite: GameObjects.Rectangle;
  vx: number;
  vy: number;
  rot: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  radius: number;
  size: AsteroidSize;
  points: number;
  color: number;
}

interface PowerUp {
  sprite: GameObjects.Arc;
  type: 'shield' | 'rapid' | 'spread';
  vy: number;
  alive: boolean;
  timer: number;
}

interface Boss {
  container: GameObjects.Container;
  body: GameObjects.Rectangle;
  hpBar: GameObjects.Rectangle;
  hpBarBg: GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  alive: boolean;
  phase: number;
  timer: number;
  moveTimer: number;
  startX: number;
  dir: number;
  entered: boolean;
  points: number;
}

interface Particle {
  gfx: GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  decay: number;
}

interface Star {
  gfx: GameObjects.Arc;
  speed: number;
}

interface EnemyBullet {
  sprite: GameObjects.Rectangle;
  vx: number;
  vy: number;
  alive: boolean;
}

// ─── Asteroid config ───

const ASTEROID_CONFIG: Record<AsteroidSize, { radius: number; hp: number; speed: number; color: number; stroke: number; points: number; width: number; height: number }> = {
  small:  { radius: 10, hp: 1, speed: 120, color: 0xf97316, stroke: 0xfbbf24, points: 10, width: 18, height: 18 },
  medium: { radius: 18, hp: 2, speed: 80,  color: 0xa855f7, stroke: 0xc084fc, points: 25, width: 30, height: 28 },
  large:  { radius: 28, hp: 4, speed: 50,  color: 0xef4444, stroke: 0xf87171, points: 50, width: 44, height: 42 },
};

const POWERUP_COLORS: Record<string, number> = {
  shield: 0x3b82f6,
  rapid: 0xfbbf24,
  spread: 0xa855f7,
};

type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WAVE_TRANSITION' | 'BOSS_INTRO';

export class CosmicDriftScene extends ClawgamePhaserScene {
  // World
  private worldW = 800;
  private worldH = 600;

  // State
  private state: GameState = 'TITLE';
  private score = 0;
  private highScore = 0;
  private wave = 0;
  private loopCount = 0;
  private waveTimer = 0;
  private waveTransitionTimer = 0;
  private gameTime = 0;

  // Player
  private player!: GameObjects.Rectangle;
  private playerVx = 0;
  private playerVy = 0;
  private playerHp = 100;
  private playerMaxHp = 100;
  private playerInvulnTimer = 0;
  private weaponLevel = 1;
  private shootCooldown = 0;
  private baseFireRate = 160;

  // Power-up state
  private shieldActive = false;
  private shieldGlow?: GameObjects.Arc;
  private rapidFireTimer = 0;
  private spreadShotTimer = 0;

  // Collections
  private bullets: Bullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private asteroids: Asteroid[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private trailParticles: Particle[] = [];
  private stars: Star[] = [];
  private boss: Boss | null = null;

  // Input
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  // UI
  private hpBarBg!: GameObjects.Rectangle;
  private hpBar!: GameObjects.Rectangle;
  private scoreText!: GameObjects.Text;
  private waveText!: GameObjects.Text;
  private highScoreText!: GameObjects.Text;
  private messageText!: GameObjects.Text;
  private messageTimer = 0;
  private controlsText!: GameObjects.Text;
  private powerUpIndicator!: GameObjects.Text;
  private titleText!: GameObjects.Text;
  private subtitleText!: GameObjects.Text;
  private gameOverText!: GameObjects.Text;
  private gameOverScore!: GameObjects.Text;
  private gameOverHigh!: GameObjects.Text;
  private restartText!: GameObjects.Text;
  private pauseOverlay!: GameObjects.Rectangle;
  private pauseText!: GameObjects.Text;

  // UI container (for easy show/hide by state)
  private titleGroup!: GameObjects.Container;
  private gameGroup!: GameObjects.Container;
  private gameOverGroup!: GameObjects.Container;
  private hudGroup!: GameObjects.Container;
  private pauseGroup!: GameObjects.Container;

  // Persistent objects (created once in create, reused across restarts)
  private engineGlow!: GameObjects.Arc;

  constructor() {
    super('cosmic-drift');
  }

  // ─── Lifecycle ───

  create(): void {
    if (!this.bootstrap) return;
    this.worldW = this.bootstrap.bounds?.width ?? 800;
    this.worldH = this.bootstrap.bounds?.height ?? 600;
    this.cameras?.main?.setBackgroundColor(0x050510);

    // Load high score
    try {
      this.highScore = parseInt(localStorage.getItem('cosmic-drift-highscore') ?? '0', 10) || 0;
    } catch {
      this.highScore = 0;
    }

    // Input
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'P', 'ENTER']) {
        this.keys[k] = kb.addKey(k);
      }
    }

    // Starfield (always visible, behind everything)
    this.createStarfield();

    // Nebula atmosphere
    const nebulaColors = [0x1a0030, 0x001a30, 0x0a0020, 0x000033];
    for (let i = 0; i < 6; i++) {
      this.add.circle(
        Math.random() * this.worldW,
        Math.random() * this.worldH,
        60 + Math.random() * 100,
        nebulaColors[i % nebulaColors.length],
        0.3,
      ).setDepth(0);
    }

    // ─── Create UI groups ───

    this.titleGroup = this.add.container(0, 0).setDepth(70);
    this.gameGroup = this.add.container(0, 0).setDepth(5);
    this.hudGroup = this.add.container(0, 0).setDepth(50);
    this.pauseGroup = this.add.container(0, 0).setDepth(80).setVisible(false);
    this.gameOverGroup = this.add.container(0, 0).setDepth(75).setVisible(false);

    // ─── Title Screen ───
    this.titleText = this.add.text(this.worldW / 2, this.worldH / 2 - 60, 'COSMIC DRIFT', {
      fontSize: '32px', color: '#00ffcc', fontFamily: 'monospace', fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5);
    this.titleGroup.add(this.titleText);

    this.subtitleText = this.add.text(this.worldW / 2, this.worldH / 2 - 20, 'A SPACE SHOOTER', {
      fontSize: '12px', color: '#a78bfa', fontFamily: 'monospace', letterSpacing: 3,
    }).setOrigin(0.5);
    this.titleGroup.add(this.subtitleText);

    this.controlsText = this.add.text(this.worldW / 2, this.worldH / 2 + 30, 'ARROWS/WASD move\nSPACE fire\nP pause', {
      fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);
    this.titleGroup.add(this.controlsText);

    const startText = this.add.text(this.worldW / 2, this.worldH / 2 + 90, '— PRESS ENTER TO START —', {
      fontSize: '14px', color: '#00ffcc', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.titleGroup.add(startText);
    // Blink
    this.tweens?.add({ targets: startText, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });

    if (this.highScore > 0) {
      const hsText = this.add.text(this.worldW / 2, this.worldH / 2 + 120, `HIGH SCORE: ${this.highScore}`, {
        fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.titleGroup.add(hsText);
    }

    // ─── HUD ───
    this.hpBarBg = this.add.rectangle(14 + 60, 16, 120, 10, 0x1e1e2e).setScrollFactor(0);
    this.hpBar = this.add.rectangle(14, 16, 120, 10, 0x22c55e).setScrollFactor(0);
    this.hpBar.setOrigin(0, 0.5);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hudGroup.add(this.hpBarBg);
    this.hudGroup.add(this.hpBar);

    this.scoreText = this.add.text(14, 30, 'Score: 0', {
      fontSize: '12px', color: '#00ffcc', fontFamily: 'monospace',
    }).setScrollFactor(0);
    this.hudGroup.add(this.scoreText);

    this.waveText = this.add.text(this.worldW - 14, 12, 'Wave 0', {
      fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0);
    this.hudGroup.add(this.waveText);

    this.highScoreText = this.add.text(this.worldW - 14, 30, `HI: ${this.highScore}`, {
      fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0);
    this.hudGroup.add(this.highScoreText);

    this.powerUpIndicator = this.add.text(14, 48, '', {
      fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace',
    }).setScrollFactor(0);
    this.hudGroup.add(this.powerUpIndicator);

    this.messageText = this.add.text(this.worldW / 2, this.worldH / 2, '', {
      fontSize: '22px', color: '#00ffcc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    this.hudGroup.add(this.messageText);

    // ─── Pause Overlay ───
    this.pauseOverlay = this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x000000, 0.6).setScrollFactor(0);
    this.pauseGroup.add(this.pauseOverlay);
    this.pauseText = this.add.text(this.worldW / 2, this.worldH / 2, 'PAUSED', {
      fontSize: '28px', color: '#00ffcc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    this.pauseGroup.add(this.pauseText);
    const pauseHint = this.add.text(this.worldW / 2, this.worldH / 2 + 40, 'Press P to resume', {
      fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.pauseGroup.add(pauseHint);

    // ─── Game Over Screen ───
    const goOverlay = this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x000000, 0.7).setScrollFactor(0);
    this.gameOverGroup.add(goOverlay);
    this.gameOverText = this.add.text(this.worldW / 2, this.worldH / 2 - 60, 'GAME OVER', {
      fontSize: '30px', color: '#ef4444', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    this.gameOverGroup.add(this.gameOverText);
    this.gameOverScore = this.add.text(this.worldW / 2, this.worldH / 2 - 10, 'Score: 0', {
      fontSize: '18px', color: '#00ffcc', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.gameOverGroup.add(this.gameOverScore);
    this.gameOverHigh = this.add.text(this.worldW / 2, this.worldH / 2 + 20, '', {
      fontSize: '14px', color: '#fbbf24', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.gameOverGroup.add(this.gameOverHigh);
    this.restartText = this.add.text(this.worldW / 2, this.worldH / 2 + 70, '— PRESS ENTER TO RESTART —', {
      fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.gameOverGroup.add(this.restartText);
    this.tweens?.add({ targets: this.restartText, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });

    // Set initial state
    this.showTitleState();
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    // Always update stars (parallax backdrop)
    this.updateStars(dt);

    // Handle state transitions
    if (this.state === 'TITLE') {
      if (PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.sound?.play('sfx-start');
        this.startGame();
      }
      return;
    }

    if (this.state === 'GAME_OVER') {
      if (PhaserInput.Keyboard.JustDown(this.keys.ENTER)) {
        this.sound?.play('sfx-start');
        this.startGame();
      }
      return;
    }

    // Pause toggle
    if (PhaserInput.Keyboard.JustDown(this.keys.P)) {
      if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        this.pauseGroup.setVisible(false);
        this.scene.resume();
      } else if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        this.pauseGroup.setVisible(true);
        this.scene.pause();
      }
      return;
    }

    if (this.state === 'PAUSED') return;

    // ─── Playing states ───

    if (this.state === 'WAVE_TRANSITION') {
      this.waveTransitionTimer -= delta;
      if (this.waveTransitionTimer <= 0) {
        this.state = 'PLAYING';
      }
      this.updateParticles(delta, this.particles);
      this.updateParticles(delta, this.trailParticles);
      this.updatePowerUps(dt);
      this.updateEnemyBullets(dt);
      return;
    }

    if (this.state === 'BOSS_INTRO') {
      this.waveTransitionTimer -= delta;
      if (this.waveTransitionTimer <= 0) {
        this.state = 'PLAYING';
      }
      this.updateParticles(delta, this.particles);
      this.updateParticles(delta, this.trailParticles);
      if (this.boss) this.updateBoss(dt);
      return;
    }

    if (this.state !== 'PLAYING') return;

    this.gameTime += delta;

    // ─── Player movement (smooth acceleration/deceleration) ───
    const accel = 1200;
    const friction = 6;
    const maxSpeed = 350;

    let inputX = 0;
    let inputY = 0;
    if (this.keys.LEFT?.isDown || this.keys.A?.isDown) inputX = -1;
    if (this.keys.RIGHT?.isDown || this.keys.D?.isDown) inputX = 1;
    if (this.keys.UP?.isDown || this.keys.W?.isDown) inputY = -1;
    if (this.keys.DOWN?.isDown || this.keys.S?.isDown) inputY = 1;

    // Normalize diagonal
    if (inputX !== 0 && inputY !== 0) {
      inputX *= 0.707;
      inputY *= 0.707;
    }

    this.playerVx += inputX * accel * dt;
    this.playerVy += inputY * accel * dt;

    // Apply friction
    this.playerVx *= Math.pow(1 / (1 + friction * dt), 1);
    this.playerVy *= Math.pow(1 / (1 + friction * dt), 1);

    // Clamp speed
    const speed = Math.sqrt(this.playerVx ** 2 + this.playerVy ** 2);
    if (speed > maxSpeed) {
      this.playerVx = (this.playerVx / speed) * maxSpeed;
      this.playerVy = (this.playerVy / speed) * maxSpeed;
    }

    // Deadzone
    if (Math.abs(this.playerVx) < 1) this.playerVx = 0;
    if (Math.abs(this.playerVy) < 1) this.playerVy = 0;

    this.player.x = PhaserMath.Clamp(this.player.x + this.playerVx * dt, 20, this.worldW - 20);
    this.player.y = PhaserMath.Clamp(this.player.y + this.playerVy * dt, 40, this.worldH - 20);

    // Ship tilt based on horizontal movement
    const tiltTarget = PhaserMath.Clamp(this.playerVx / maxSpeed * 15, -15, 15);
    this.player.angle += (tiltTarget - this.player.angle) * 8 * dt;

    // Invulnerability
    if (this.playerInvulnTimer > 0) {
      this.playerInvulnTimer -= delta;
      this.player.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
      if (this.playerInvulnTimer <= 0) {
        this.player.setAlpha(1);
      }
    }

    // ─── Weapon level based on score ───
    if (this.score >= 500) this.weaponLevel = 4;
    else if (this.score >= 300) this.weaponLevel = 3;
    else if (this.score >= 100) this.weaponLevel = 2;
    else this.weaponLevel = 1;

    // ─── Shooting ───
    this.shootCooldown -= delta;
    const fireRate = this.rapidFireTimer > 0 ? this.baseFireRate * 0.5 : this.baseFireRate;
    if (this.keys.SPACE?.isDown && this.shootCooldown <= 0) {
      this.shootCooldown = fireRate;
      this.sound?.play('sfx-shoot');
      this.fireWeapon();
    }

    // ─── Power-up timers ───
    if (this.rapidFireTimer > 0) this.rapidFireTimer -= delta;
    if (this.spreadShotTimer > 0) this.spreadShotTimer -= delta;

    // ─── Engine trail ───
    this.spawnTrailParticle(this.player.x - 6, this.player.y + 18);
    this.spawnTrailParticle(this.player.x + 6, this.player.y + 18);

    // ─── Update bullets ───
    this.updateBullets(dt);

    // ─── Update enemy bullets ───
    this.updateEnemyBullets(dt);

    // ─── Update asteroids ───
    this.updateAsteroids(dt);

    // ─── Update boss ───
    if (this.boss) this.updateBoss(dt);

    // ─── Update power-ups ───
    this.updatePowerUps(dt);

    // ─── Update particles ───
    this.updateParticles(delta, this.particles);
    this.updateParticles(delta, this.trailParticles);

    // ─── Wave management ───
    this.waveTimer -= delta;
    const aliveAsteroids = this.asteroids.filter(a => a.alive).length;
    const hasBoss = this.boss && this.boss.alive;

    if (this.waveTimer < 0 && aliveAsteroids === 0 && !hasBoss) {
      this.advanceWave();
    }

    // ─── Update HUD ───
    this.updateHUD();
  }

  // ─── Game State Management ───

  private showTitleState(): void {
    this.state = 'TITLE';
    this.titleGroup.setVisible(true);
    this.gameGroup.setVisible(false);
    this.hudGroup.setVisible(false);
    this.gameOverGroup.setVisible(false);
    this.pauseGroup.setVisible(false);
  }

  private startGame(): void {
    // Reset all game state
    this.score = 0;
    this.wave = 0;
    this.loopCount = 0;
    this.gameTime = 0;
    this.playerHp = this.playerMaxHp;
    this.playerInvulnTimer = 0;
    this.weaponLevel = 1;
    this.shootCooldown = 0;
    this.shieldActive = false;
    this.rapidFireTimer = 0;
    this.spreadShotTimer = 0;
    this.waveTimer = 0;

    // Clear all game objects
    this.cleanupBullets();
    this.cleanupEnemyBullets();
    this.cleanupAsteroids();
    this.cleanupPowerUps();
    this.cleanupBoss();
    this.cleanupParticles();

    // Clear game group
    this.gameGroup.removeAll(true);

    // Rebuild game objects
    this.buildGameObjects();

    // Show game UI
    this.titleGroup.setVisible(false);
    this.gameOverGroup.setVisible(false);
    this.pauseGroup.setVisible(false);
    this.gameGroup.setVisible(true);
    this.hudGroup.setVisible(true);

    // Fade in
    this.cameras?.main?.fadeIn(400, 0, 0, 0);

    // Start first wave after short delay
    this.waveTimer = 1500;
    this.state = 'PLAYING';

    this.sound?.play('sfx-wave');
    this.showMessage('WAVE 1', 1800);
  }

  private buildGameObjects(): void {
    // Player ship
    this.player = this.add.rectangle(this.worldW / 2, this.worldH - 80, 28, 36, 0x00ffcc);
    this.player.setStrokeStyle(1, 0x00ffff, 0.6).setDepth(10);
    this.gameGroup.add(this.player);

    // Engine glow
    this.engineGlow = this.add.circle(this.worldW / 2, this.worldH - 56, 10, 0x00ffcc, 0.15).setDepth(9);
    this.gameGroup.add(this.engineGlow);
    this.tweens?.add({
      targets: this.engineGlow,
      scaleX: 1.8, scaleY: 1.8, alpha: 0.05,
      duration: 600, yoyo: true, repeat: -1,
    });
  }

  private gameOver(): void {
    this.state = 'GAME_OVER';

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('cosmic-drift-highscore', String(this.highScore));
      } catch { /* ignore */ }
      this.gameOverHigh.setText('★ NEW HIGH SCORE! ★');
    } else {
      this.gameOverHigh.setText(`High Score: ${this.highScore}`);
    }

    this.gameOverScore.setText(`Score: ${this.score}`);

    // Fade out then show game over
    this.cameras?.main?.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(700, () => {
      this.gameOverGroup.setVisible(true);
      this.hudGroup.setVisible(false);
      this.gameGroup.setVisible(false);
      this.sound?.play('sfx-gameover');
    });
  }

  private advanceWave(): void {
    this.wave++;

    // Boss check
    if (this.wave % 5 === 0) {
      this.state = 'BOSS_INTRO';
      this.waveTransitionTimer = 2000;
      this.showMessage(`⚠ BOSS INCOMING ⚠`, 1800);
      this.sound?.play('sfx-boss');
      this.time.delayedCall(1000, () => {
        this.spawnBoss();
      });
      return;
    }

    // Loop after 10 waves
    let effectiveWave = this.wave;
    if (this.wave > 10) {
      this.loopCount = Math.floor((this.wave - 1) / 10);
      effectiveWave = ((this.wave - 1) % 10) + 1;
    }

    this.state = 'WAVE_TRANSITION';
    this.waveTransitionTimer = 1800;
    this.showMessage(`WAVE ${this.wave}`, 1500);
    this.sound?.play('sfx-wave');

    // Spawn asteroids after short delay
    this.time.delayedCall(600, () => {
      this.spawnWaveAsteroids(effectiveWave);
    });

    this.waveTimer = 5000;
  }

  // ─── Wave System ───

  private spawnWaveAsteroids(waveNum: number): void {
    const difficultyMult = 1 + this.loopCount * 0.5;
    const speedMult = 1 + (waveNum - 1) * 0.08 + (this.loopCount * 0.15);
    const hpMult = 1 + Math.floor(this.loopCount * 0.3);

    // Wave composition
    let smallCount = 0;
    let mediumCount = 0;
    let largeCount = 0;

    if (waveNum <= 2) {
      smallCount = 3 + waveNum;
      mediumCount = Math.floor(waveNum * 0.5);
    } else if (waveNum <= 5) {
      smallCount = 2 + waveNum;
      mediumCount = 1 + waveNum;
      largeCount = waveNum - 3;
    } else if (waveNum <= 8) {
      smallCount = 3 + waveNum;
      mediumCount = 2 + waveNum;
      largeCount = waveNum - 3;
    } else {
      smallCount = 4 + waveNum;
      mediumCount = 3 + waveNum;
      largeCount = waveNum - 2;
    }

    const spawnAsteroid = (size: AsteroidSize, count: number): void => {
      const cfg = ASTEROID_CONFIG[size];
      for (let i = 0; i < count; i++) {
        const x = 30 + Math.random() * (this.worldW - 60);
        const y = -30 - Math.random() * 100;
        const hp = cfg.hp + (hpMult > 1 && size !== 'small' ? Math.floor(Math.random() * hpMult) : 0);
        this.spawnAsteroid(x, y, size, speedMult, hp);
      }
    };

    spawnAsteroid('small', smallCount);
    spawnAsteroid('medium', mediumCount);
    spawnAsteroid('large', largeCount);
  }

  private spawnAsteroid(x: number, y: number, size: AsteroidSize, speedMult: number = 1, hp?: number): void {
    const cfg = ASTEROID_CONFIG[size];
    const finalHp = hp ?? cfg.hp;
    const sprite = this.add.rectangle(x, y, cfg.width, cfg.height, cfg.color).setDepth(5);
    sprite.setStrokeStyle(1, cfg.stroke, 0.4);
    this.gameGroup.add(sprite);
    this.tweens?.add({ targets: sprite, angle: 360, duration: 2000 + Math.random() * 3000, repeat: -1 });

    const asteroid: Asteroid = {
      sprite,
      vx: (Math.random() - 0.5) * cfg.speed * 0.8,
      vy: cfg.speed * speedMult * (0.8 + Math.random() * 0.4),
      rot: (Math.random() - 0.5) * 2,
      hp: finalHp,
      maxHp: finalHp,
      alive: true,
      radius: cfg.radius,
      size,
      points: cfg.points,
      color: cfg.color,
    };
    this.asteroids.push(asteroid);
  }

  // ─── Boss System ───

  private spawnBoss(): void {
    if (this.boss) this.cleanupBoss();

    const difficultyMult = 1 + this.loopCount * 0.5;
    const bossHp = Math.floor(30 * difficultyMult);
    const bossPoints = 500 * (this.loopCount + 1);

    const bossBody = this.add.rectangle(this.worldW / 2, -60, 64, 48, 0xff2244).setDepth(11);
    bossBody.setStrokeStyle(2, 0xff6688, 0.6);

    // Boss details (decorative)
    const bossCore = this.add.circle(0, 0, 8, 0xff0044, 0.8).setDepth(12);
    const bossEyeL = this.add.circle(-12, -6, 4, 0xffffff, 0.9).setDepth(12);
    const bossEyeR = this.add.circle(12, -6, 4, 0xffffff, 0.9).setDepth(12);

    const container = this.add.container(this.worldW / 2, -60);
    container.add([bossBody, bossCore, bossEyeL, bossEyeR]);
    container.setDepth(11);
    this.gameGroup.add(container);

    // HP bar
    const hpBarBg = this.add.rectangle(this.worldW / 2, 55, 200, 8, 0x1e1e2e).setDepth(52).setScrollFactor(0);
    const hpBar = this.add.rectangle(this.worldW / 2 - 100 + 100, 55, 200, 8, 0xff2244).setDepth(53).setScrollFactor(0);
    hpBar.setOrigin(0, 0.5);
    this.hudGroup.add(hpBarBg);
    this.hudGroup.add(hpBar);

    // Boss name
    const bossLabel = this.add.text(this.worldW / 2, 42, 'BOSS', {
      fontSize: '10px', color: '#ff2244', fontFamily: 'monospace', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52);
    this.hudGroup.add(bossLabel);

    this.boss = {
      container,
      body: bossBody,
      hpBar,
      hpBarBg,
      hp: bossHp,
      maxHp: bossHp,
      alive: true,
      phase: 0,
      timer: 0,
      moveTimer: 0,
      startX: this.worldW / 2,
      dir: 1,
      entered: false,
      points: bossPoints,
    };

    // Enter animation
    this.tweens?.add({
      targets: container,
      y: 100,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => { if (this.boss) this.boss.entered = true; },
    });

    // Pulse core
    this.tweens?.add({
      targets: bossCore,
      scaleX: 1.3, scaleY: 1.3, alpha: 0.5,
      duration: 500, yoyo: true, repeat: -1,
    });
  }

  private updateBoss(dt: number): void {
    if (!this.boss || !this.boss.alive) return;

    if (!this.boss.entered) return;

    this.boss.timer += dt;
    this.boss.moveTimer += dt;

    // Movement: side-to-side sweeping
    const moveSpeed = 120 + this.loopCount * 20;
    this.boss.container.x += this.boss.dir * moveSpeed * dt;
    if (this.boss.container.x > this.worldW - 60) this.boss.dir = -1;
    if (this.boss.container.x < 60) this.boss.dir = 1;

    // Shooting patterns
    const fireRate = Math.max(0.3, 0.8 - this.loopCount * 0.1);
    if (this.boss.timer >= fireRate) {
      this.boss.timer = 0;
      this.boss.phase = (this.boss.phase + 1) % 3;

      const bx = this.boss.container.x;
      const by = this.boss.container.y;

      if (this.boss.phase === 0) {
        // Aimed shot at player
        this.spawnEnemyBullet(bx, by + 30, 0, 250);
        this.sound?.play('sfx-enemy-shoot');
      } else if (this.boss.phase === 1) {
        // Spread of 3
        this.spawnEnemyBullet(bx, by + 30, -60, 220);
        this.spawnEnemyBullet(bx, by + 30, 0, 240);
        this.spawnEnemyBullet(bx, by + 30, 60, 220);
        this.sound?.play('sfx-enemy-shoot');
      } else {
        // Fast double shot
        this.spawnEnemyBullet(bx - 15, by + 25, -20, 300);
        this.spawnEnemyBullet(bx + 15, by + 25, 20, 300);
        this.sound?.play('sfx-enemy-shoot');
      }
    }

    // Update HP bar
    const hpPct = this.boss.hp / this.boss.maxHp;
    this.boss.hpBar.width = 200 * Math.max(0, hpPct);

    // Check collision with player bullets
    const bx = this.boss.container.x;
    const by = this.boss.container.y;
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      if (this.dist(bx, by, bullet.sprite.x, bullet.sprite.y) < 35) {
        bullet.alive = false;
        bullet.sprite.setVisible(false);
        this.boss.hp--;
        this.spawnMiniExplosion(bullet.sprite.x, bullet.sprite.y);

        if (this.boss.hp <= 0) {
          this.destroyBoss();
        }
      }
    }

    // Collision with player
    if (this.dist(bx, by, this.player.x, this.player.y) < 40 && this.playerInvulnTimer <= 0) {
      this.playerHit(30);
    }
  }

  private destroyBoss(): void {
    if (!this.boss) return;
    this.boss.alive = false;

    // Big explosion
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 150, () => {
        if (!this.boss) return;
        this.spawnExplosion(
          this.boss.container.x + (Math.random() - 0.5) * 40,
          this.boss.container.y + (Math.random() - 0.5) * 30,
          30,
        );
      });
    }

    this.score += this.boss.points;
    this.showMessage(`BOSS DEFEATED! +${this.boss.points}`, 2500);
    this.sound?.play('sfx-boss-death');
    this.cameras?.main?.shake(400, 0.015);

    // Clean up boss visuals after delay
    const bossRef = this.boss;
    this.time.delayedCall(1500, () => {
      bossRef.container.destroy(true);
      bossRef.hpBar.destroy();
      bossRef.hpBarBg.destroy();
    });

    this.boss = null;
    this.waveTimer = 2000;
  }

  private cleanupBoss(): void {
    if (this.boss) {
      this.boss.container.destroy(true);
      this.boss.hpBar?.destroy();
      this.boss.hpBarBg?.destroy();
      this.boss = null;
    }
  }

  // ─── Weapon System ───

  private fireWeapon(): void {
    const px = this.player.x;
    const py = this.player.y - 22;

    const effectiveLevel = this.spreadShotTimer > 0 ? Math.max(this.weaponLevel, 3) : this.weaponLevel;

    switch (effectiveLevel) {
      case 1:
        // Single shot
        this.spawnBullet(px, py, 0, -550, 0x00ffcc);
        break;
      case 2:
        // Double shot
        this.spawnBullet(px - 7, py, 0, -550, 0x00ffcc);
        this.spawnBullet(px + 7, py, 0, -550, 0x00ffcc);
        break;
      case 3:
        // Triple shot
        this.spawnBullet(px, py, 0, -550, 0x00ffcc);
        this.spawnBullet(px - 10, py + 4, -50, -520, 0x88ffdd);
        this.spawnBullet(px + 10, py + 4, 50, -520, 0x88ffdd);
        break;
      case 4:
      default:
        // Spread: 5 bullets
        this.spawnBullet(px, py, 0, -560, 0x00ffcc);
        this.spawnBullet(px - 8, py + 2, -40, -540, 0x66ffcc);
        this.spawnBullet(px + 8, py + 2, 40, -540, 0x66ffcc);
        this.spawnBullet(px - 14, py + 6, -90, -480, 0x33ddaa);
        this.spawnBullet(px + 14, py + 6, 90, -480, 0x33ddaa);
        break;
    }
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, color: number): void {
    const sprite = this.add.rectangle(x, y, 3, 12, color).setDepth(8);
    this.gameGroup.add(sprite);

    // Bullet glow
    const glow = this.add.circle(x, y, 5, color, 0.15).setDepth(7);
    this.gameGroup.add(glow);
    this.tweens?.add({
      targets: glow,
      alpha: 0,
      duration: 400,
      onComplete: () => glow.destroy(),
    });

    this.bullets.push({ sprite, vx, vy, alive: true });
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number): void {
    const sprite = this.add.rectangle(x, y, 4, 10, 0xff4444).setDepth(8);
    this.gameGroup.add(sprite);
    this.enemyBullets.push({ sprite, vx, vy, alive: true });
  }

  // ─── Power-up System ───

  private tryDropPowerUp(x: number, y: number): void {
    if (Math.random() > 0.1) return; // 10% chance

    const types: Array<'shield' | 'rapid' | 'spread'> = ['shield', 'rapid', 'spread'];
    const type = types[Math.floor(Math.random() * types.length)];
    const color = POWERUP_COLORS[type];
    const sprite = this.add.circle(x, y, 10, color, 0.9).setDepth(12);
    sprite.setStrokeStyle(1, 0xffffff, 0.5);
    this.gameGroup.add(sprite);

    // Glow effect
    this.tweens?.add({
      targets: sprite,
      scaleX: 1.3, scaleY: 1.3, alpha: 0.5,
      duration: 400, yoyo: true, repeat: -1,
    });

    this.powerUps.push({ sprite, type, vy: 60, alive: true, timer: 0 });
  }

  private applyPowerUp(type: 'shield' | 'rapid' | 'spread'): void {
    this.sound?.play('sfx-powerup');
    switch (type) {
      case 'shield':
        this.shieldActive = true;
        if (!this.shieldGlow) {
          this.shieldGlow = this.add.circle(this.player.x, this.player.y, 24, 0x3b82f6, 0.2).setDepth(9);
          this.gameGroup.add(this.shieldGlow);
          this.tweens?.add({
            targets: this.shieldGlow,
            scaleX: 1.2, scaleY: 1.2, alpha: 0.1,
            duration: 500, yoyo: true, repeat: -1,
          });
        }
        this.showMessage('SHIELD!', 1000);
        break;
      case 'rapid':
        this.rapidFireTimer = 5000;
        this.showMessage('RAPID FIRE!', 1000);
        break;
      case 'spread':
        this.spreadShotTimer = 8000;
        this.showMessage('SPREAD SHOT!', 1000);
        break;
    }
  }

  // ─── Player Damage ───

  private playerHit(dmg: number): void {
    if (this.playerInvulnTimer > 0 || this.state !== 'PLAYING') return;

    // Shield absorbs hit
    if (this.shieldActive) {
      this.shieldActive = false;
      this.sound?.play('sfx-shield-break');
      if (this.shieldGlow) {
        this.spawnExplosion(this.player.x, this.player.y, 20);
        this.shieldGlow.destroy();
        this.shieldGlow = undefined;
      }
      this.playerInvulnTimer = 500;
      return;
    }

    this.playerHp -= dmg;
    this.sound?.play('sfx-hit');
    this.cameras?.main?.shake(250, 0.012);

    // Flash red
    this.player.setFillStyle(0xff0000);
    this.time.delayedCall(80, () => { if (this.player) this.player.setFillStyle(0x00ffcc); });

    // Invulnerability window
    this.playerInvulnTimer = 1500;

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.spawnExplosion(this.player.x, this.player.y, 40);
      this.player.setVisible(false);
      this.time.delayedCall(800, () => this.gameOver());
    }
  }

  // ─── Update Methods ───

  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
      if (b.sprite.y < -20 || b.sprite.x < -20 || b.sprite.x > this.worldW + 20) {
        b.alive = false;
        b.sprite.setVisible(false);
      }
    }
  }

  private updateEnemyBullets(dt: number): void {
    for (const b of this.enemyBullets) {
      if (!b.alive) continue;
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;

      // Off screen
      if (b.sprite.y > this.worldH + 20 || b.sprite.x < -20 || b.sprite.x > this.worldW + 20 || b.sprite.y < -20) {
        b.alive = false;
        b.sprite.setVisible(false);
        continue;
      }

      // Hit player
      if (this.dist(b.sprite.x, b.sprite.y, this.player.x, this.player.y) < 18 && this.playerInvulnTimer <= 0) {
        b.alive = false;
        b.sprite.setVisible(false);
        this.playerHit(15);
      }
    }
  }

  private updateAsteroids(dt: number): void {
    for (const a of this.asteroids) {
      if (!a.alive) continue;

      a.sprite.x += a.vx * dt;
      a.sprite.y += a.vy * dt;

      // Wrap horizontally
      if (a.sprite.x < -50) a.sprite.x = this.worldW + 50;
      if (a.sprite.x > this.worldW + 50) a.sprite.x = -50;

      // Off bottom
      if (a.sprite.y > this.worldH + 60) {
        a.alive = false;
        a.sprite.setVisible(false);
        continue;
      }

      // Hit player
      if (this.dist(a.sprite.x, a.sprite.y, this.player.x, this.player.y) < a.radius + 14) {
        a.alive = false;
        a.sprite.setVisible(false);
        this.playerHit(a.size === 'large' ? 25 : a.size === 'medium' ? 15 : 10);
        this.spawnExplosion(a.sprite.x, a.sprite.y, a.radius);
        continue;
      }

      // Hit by bullet
      for (const b of this.bullets) {
        if (!b.alive) continue;
        if (this.dist(a.sprite.x, a.sprite.y, b.sprite.x, b.sprite.y) < a.radius + 6) {
          b.alive = false;
          b.sprite.setVisible(false);
          a.hp--;

          if (a.hp <= 0) {
            a.alive = false;
            a.sprite.setVisible(false);
            this.score += a.points;
            this.sound?.play('sfx-explosion');
            this.spawnExplosion(a.sprite.x, a.sprite.y, a.radius);

            // Large asteroids split
            if (a.size === 'large') {
              this.spawnAsteroid(a.sprite.x - 15, a.sprite.y, 'medium');
              this.spawnAsteroid(a.sprite.x + 15, a.sprite.y, 'medium');
            }

            // Power-up drop
            this.tryDropPowerUp(a.sprite.x, a.sprite.y);
          } else {
            // Flash white on hit
            a.sprite.setFillStyle(0xffffff);
            this.time.delayedCall(60, () => {
              if (a.sprite && a.alive) a.sprite.setFillStyle(a.color);
            });
            this.spawnMiniExplosion(b.sprite.x, b.sprite.y);
          }
          break;
        }
      }
    }
  }

  private updatePowerUps(dt: number): void {
    // Shield glow follows player
    if (this.shieldGlow && this.player) {
      this.shieldGlow.setPosition(this.player.x, this.player.y);
    }

    for (const p of this.powerUps) {
      if (!p.alive) continue;
      p.sprite.y += p.vy * dt;
      p.timer += dt;

      // Off screen
      if (p.sprite.y > this.worldH + 20) {
        p.alive = false;
        p.sprite.setVisible(false);
        continue;
      }

      // Collect
      if (this.dist(p.sprite.x, p.sprite.y, this.player.x, this.player.y) < 26) {
        p.alive = false;
        p.sprite.setVisible(false);
        this.applyPowerUp(p.type);
        this.tweens?.add({
          targets: p.sprite,
          scaleX: 2, scaleY: 2, alpha: 0,
          duration: 200,
          onComplete: () => p.sprite.destroy(),
        });
      }
    }
  }

  private updateStars(dt: number): void {
    for (const s of this.stars) {
      s.gfx.y += s.speed * dt;
      if (s.gfx.y > this.worldH + 5) {
        s.gfx.y = -5;
        s.gfx.x = Math.random() * this.worldW;
      }
    }
  }

  private updateHUD(): void {
    // HP bar
    const hpPct = Math.max(0, this.playerHp / this.playerMaxHp);
    this.hpBar.width = 120 * hpPct;
    this.hpBar.fillColor = this.playerHp > 50 ? 0x22c55e : this.playerHp > 25 ? 0xfbbf24 : 0xef4444;

    // Score
    this.scoreText.setText(`Score: ${this.score}`);

    // Wave
    this.waveText.setText(`Wave ${this.wave}`);

    // High score
    this.highScoreText.setText(`HI: ${Math.max(this.highScore, this.score)}`);

    // Power-up indicators
    const indicators: string[] = [];
    if (this.shieldActive) indicators.push('🛡 SHIELD');
    if (this.rapidFireTimer > 0) indicators.push(`⚡ RAPID ${(this.rapidFireTimer / 1000).toFixed(1)}s`);
    if (this.spreadShotTimer > 0) indicators.push(`🔮 SPREAD ${(this.spreadShotTimer / 1000).toFixed(1)}s`);
    this.powerUpIndicator.setText(indicators.join('  '));
  }

  // ─── Particle System ───

  private createStarfield(): void {
    const layers = [
      { count: 60, size: 1, speed: 30, alpha: 0.3 },
      { count: 30, size: 1.5, speed: 60, alpha: 0.5 },
      { count: 15, size: 2, speed: 100, alpha: 0.8 },
    ];
    const starColors = [0xffffff, 0xaaccff, 0xffccaa];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const x = Math.random() * this.worldW;
        const y = Math.random() * this.worldH;
        const color = starColors[Math.floor(Math.random() * starColors.length)];
        const gfx = this.add.circle(x, y, layer.size, color, layer.alpha).setDepth(1);
        this.stars.push({ gfx, speed: layer.speed + Math.random() * 20 });
      }
    }
  }

  private spawnExplosion(x: number, y: number, size: number): void {
    const count = 12 + Math.floor(size);
    const colors = [0xff6b35, 0xfbbf24, 0xef4444, 0xff0066];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 120;
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
      targets: ring,
      scaleX: size * 0.3, scaleY: size * 0.3, alpha: 0,
      duration: 400, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnMiniExplosion(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const gfx = this.add.circle(x, y, 1.5, 0xfbbf24).setAlpha(0.8).setDepth(15);
      this.particles.push({
        gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 250 + Math.random() * 150, maxLife: 400, decay: 0.95,
      });
    }
  }

  private spawnTrailParticle(x: number, y: number): void {
    const color = Math.random() < 0.5 ? 0x00ffcc : 0x0088ff;
    const gfx = this.add.circle(
      x + (Math.random() - 0.5) * 4,
      y,
      1.5 + Math.random() * 2,
      color,
      0.6,
    ).setDepth(9);
    this.trailParticles.push({
      gfx, vx: (Math.random() - 0.5) * 20, vy: 40 + Math.random() * 60,
      life: 250 + Math.random() * 150, maxLife: 400, decay: 0.96,
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
      if (p.life <= 0) {
        p.gfx.destroy();
        list.splice(i, 1);
      }
    }
  }

  // ─── Cleanup Methods ───

  private cleanupBullets(): void {
    for (const b of this.bullets) { b.sprite.destroy(); }
    this.bullets = [];
  }

  private cleanupEnemyBullets(): void {
    for (const b of this.enemyBullets) { b.sprite.destroy(); }
    this.enemyBullets = [];
  }

  private cleanupAsteroids(): void {
    for (const a of this.asteroids) { a.sprite.destroy(); }
    this.asteroids = [];
  }

  private cleanupPowerUps(): void {
    for (const p of this.powerUps) { p.sprite.destroy(); }
    this.powerUps = [];
    if (this.shieldGlow) {
      this.shieldGlow.destroy();
      this.shieldGlow = undefined;
    }
  }

  private cleanupParticles(): void {
    for (const p of this.particles) { p.gfx.destroy(); }
    this.particles = [];
    for (const p of this.trailParticles) { p.gfx.destroy(); }
    this.trailParticles = [];
  }

  // ─── Helpers ───

  private showMessage(text: string, dur: number): void {
    if (!this.messageText) return;
    this.messageText.setText(text).setVisible(true).setAlpha(1);
    this.messageTimer = dur;
    this.tweens?.add({
      targets: this.messageText,
      alpha: 0,
      delay: dur - 500,
      duration: 500,
    });
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
