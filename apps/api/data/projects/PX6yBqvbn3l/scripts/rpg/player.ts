/**
 * Eclipse of Runes — Player Character
 * Responsive movement with acceleration/deceleration, attack ability, and visual juice.
 */

import { TilemapEngine } from './tilemap';
import { ParticleSystem } from './particles';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerStats {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
}

export class Player {
  public x: number;
  public y: number;
  public width: number = 24;
  public height: number = 24;

  // Movement with acceleration feel
  public vx: number = 0;
  public vy: number = 0;
  private targetVx: number = 0;
  private targetVy: number = 0;
  private acceleration: number = 800; // How fast we reach max speed
  private deceleration: number = 1200; // How fast we stop
  
  public facing: Direction = 'down';
  public isMoving: boolean = false;
  public isAttacking: boolean = false;
  private attackCooldown: number = 0;
  private attackDuration: number = 0.25;
  private attackTimer: number = 0;

  // Animation
  public animFrame: number = 0;
  private animTimer: number = 0;
  private animInterval: number = 0.1;

  // Stats
  public stats: PlayerStats;
  public inventory: string[] = [];
  public runes: string[] = [];
  
  // Score tracking
  public score: number = 0;
  public enemiesDefeated: number = 0;

  // Invincibility frames after taking damage
  private invincible: boolean = false;
  private invincibleTimer: number = 0;
  private invincibleDuration: number = 1.0;

  // Trail particles reference (set by game)
  public particles: ParticleSystem | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.stats = {
      name: 'Rune Walker',
      level: 1,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 15,
      defense: 5,
      speed: 150,
    };
  }

  /**
   * Get attack hitbox based on facing direction
   */
  getAttackBox(): { x: number; y: number; width: number; height: number } | null {
    if (!this.isAttacking) return null;
    const range = 32;
    const width = 28;
    const height = 28;
    
    switch (this.facing) {
      case 'up':
        return { x: this.x - 2, y: this.y - range, width, height };
      case 'down':
        return { x: this.x - 2, y: this.y + this.height, width, height };
      case 'left':
        return { x: this.x - range, y: this.y - 2, height, width };
      case 'right':
        return { x: this.x + this.width, y: this.y - 2, height, width };
    }
  }

  update(
    keys: Record<string, boolean>,
    dt: number,
    tilemap: TilemapEngine
  ): void {
    // Update invincibility
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    // Update attack
    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    // Check for attack input (space or J)
    if ((keys[' '] || keys['j']) && !this.isAttacking && this.attackCooldown <= 0) {
      this.isAttacking = true;
      this.attackTimer = this.attackDuration;
      this.attackCooldown = 0.4;
      // TODO: Play attack sound
      // particles?.burst for swing effect
    }

    // Calculate target velocity
    this.targetVx = 0;
    this.targetVy = 0;
    const speed = this.stats.speed;

    if (keys['arrowleft'] || keys['a']) this.targetVx -= speed;
    if (keys['arrowright'] || keys['d']) this.targetVx += speed;
    if (keys['arrowup'] || keys['w']) this.targetVy -= speed;
    if (keys['arrowdown'] || keys['s']) this.targetVy += speed;

    // Normalize diagonal
    if (this.targetVx !== 0 && this.targetVy !== 0) {
      const inv = 1 / Math.sqrt(2);
      this.targetVx *= inv;
      this.targetVy *= inv;
    }

    // Apply acceleration/deceleration for smooth feel
    if (this.targetVx !== 0) {
      const diff = this.targetVx - this.vx;
      this.vx += Math.sign(diff) * Math.min(Math.abs(diff), this.acceleration * dt);
    } else {
      const sign = Math.sign(this.vx);
      this.vx -= sign * Math.min(Math.abs(this.vx), this.deceleration * dt);
    }

    if (this.targetVy !== 0) {
      const diff = this.targetVy - this.vy;
      this.vy += Math.sign(diff) * Math.min(Math.abs(diff), this.acceleration * dt);
    } else {
      const sign = Math.sign(this.vy);
      this.vy -= sign * Math.min(Math.abs(this.vy), this.deceleration * dt);
    }

    // Update facing direction
    if (this.vx < -5) this.facing = 'left';
    else if (this.vx > 5) this.facing = 'right';
    if (this.vy < -5) this.facing = 'up';
    else if (this.vy > 5) this.facing = 'down';

    this.isMoving = Math.abs(this.vx) > 5 || Math.abs(this.vy) > 5;

    // Apply movement with collision
    const newX = this.x + this.vx * dt;
    if (!tilemap.isBoxBlocked(newX, this.y, this.width, this.height)) {
      this.x = newX;
    } else {
      this.vx = 0;
    }

    const newY = this.y + this.vy * dt;
    if (!tilemap.isBoxBlocked(this.x, newY, this.width, this.height)) {
      this.y = newY;
    } else {
      this.vy = 0;
    }

    // Keep within map bounds
    this.x = Math.max(0, Math.min(this.x, tilemap.pixelWidth - this.width));
    this.y = Math.max(0, Math.min(this.y, tilemap.pixelHeight - this.height));

    // Emit trail particles when moving
    if (this.isMoving && this.particles && Math.random() < 0.4) {
      this.particles.trail(this.centerX, this.y + this.height, '#60a5fa44');
    }

    // Animation
    if (this.isMoving || this.isAttacking) {
      this.animTimer += dt;
      if (this.animTimer >= this.animInterval) {
        this.animTimer -= this.animInterval;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }
  }

  takeDamage(amount: number): void {
    if (this.invincible) return;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }
  get isInvincible(): boolean { return this.invincible; }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Flash when invincible
    if (this.invincible && Math.floor(performance.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h + 3, w / 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Attack slash effect
    if (this.isAttacking) {
      const attackBox = this.getAttackBox();
      if (attackBox) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
        ctx.lineWidth = 2;
        const asx = attackBox.x - camX;
        const asy = attackBox.y - camY;
        ctx.beginPath();
        ctx.arc(asx + attackBox.width / 2, asy + attackBox.height / 2, attackBox.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Body
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(sx + 4, sy + 6, w - 8, h - 10);

    // Cape flowing based on movement
    if (this.isMoving) {
      ctx.fillStyle = '#2d5a9e';
      const capeWave = Math.sin(this.animFrame * Math.PI / 2) * 3;
      switch (this.facing) {
        case 'left':
          ctx.fillRect(sx + w - 2, sy + 8, 4 + capeWave, h - 14);
          break;
        case 'right':
          ctx.fillRect(sx - 2 - capeWave, sy + 8, 4 + capeWave, h - 14);
          break;
      }
    }

    // Head
    ctx.fillStyle = '#f5d6b8';
    ctx.fillRect(sx + 6, sy + 2, w - 12, 10);

    // Hair
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(sx + 6, sy, w - 12, 5);

    // Eyes
    ctx.fillStyle = '#1a1a2e';
    switch (this.facing) {
      case 'down':
        ctx.fillRect(sx + 8, sy + 5, 2, 2);
        ctx.fillRect(sx + w - 10, sy + 5, 2, 2);
        break;
      case 'up':
        break;
      case 'left':
        ctx.fillRect(sx + 7, sy + 5, 2, 2);
        break;
      case 'right':
        ctx.fillRect(sx + w - 9, sy + 5, 2, 2);
        break;
    }

    // Legs with walk animation
    if (this.isMoving) {
      const bobY = Math.sin(this.animFrame * Math.PI / 2) * 2;
      ctx.fillStyle = '#3a3a5e';
      ctx.fillRect(sx + 7, sy + h - 6 + bobY, 4, 6);
      ctx.fillRect(sx + w - 11, sy + h - 6 - bobY, 4, 6);
    } else {
      ctx.fillStyle = '#3a3a5e';
      ctx.fillRect(sx + 7, sy + h - 4, 4, 4);
      ctx.fillRect(sx + w - 11, sy + h - 4, 4, 4);
    }

    // Rune glow outline
    const runeGlow = 0.3 + 0.2 * Math.sin(performance.now() / 300);
    ctx.strokeStyle = `rgba(100, 180, 255, ${runeGlow})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2, sy + 2, w - 4, h - 4);

    // Weapon (sword) shown when attacking
    if (this.isAttacking) {
      ctx.fillStyle = '#c0c0c0';
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      const swingAngle = (1 - this.attackTimer / this.attackDuration) * Math.PI;
      
      ctx.save();
      ctx.translate(sx + w / 2, sy + h / 2);
      
      switch (this.facing) {
        case 'right':
          ctx.rotate(-Math.PI / 4 + swingAngle * 0.5);
          ctx.fillRect(8, -2, 16, 4);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(4, -3, 5, 6);
          break;
        case 'left':
          ctx.rotate(Math.PI + Math.PI / 4 - swingAngle * 0.5);
          ctx.fillRect(8, -2, 16, 4);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(4, -3, 5, 6);
          break;
        case 'down':
          ctx.rotate(swingAngle * 0.3);
          ctx.fillRect(8, -2, 16, 4);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(4, -3, 5, 6);
          break;
        case 'up':
          ctx.rotate(-Math.PI + swingAngle * 0.3);
          ctx.fillRect(8, -2, 16, 4);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(4, -3, 5, 6);
          break;
      }
      ctx.restore();
    }

    ctx.restore();
  }

  renderHUD(ctx: CanvasRenderingContext2D, canvasW: number): void {
    const barW = 140;
    const barH = 12;
    const x = 12;
    const y = 12;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 6, barW + 70, 60, 6);
    ctx.fill();

    // Name + Level
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${this.stats.name} Lv${this.stats.level}`, x, y + 10);

    // HP bar
    const hpRatio = this.stats.hp / this.stats.maxHp;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(x, y + 16, barW, barH, 3);
    ctx.fill();
    
    // HP fill with gradient color based on health
    const hpColor = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(x, y + 16, barW * hpRatio, barH, 3);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`HP ${this.stats.hp}/${this.stats.maxHp}`, x + 4, y + 25);

    // MP bar
    const mpRatio = this.stats.mp / this.stats.maxMp;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(x, y + 32, barW, barH, 3);
    ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.roundRect(x, y + 32, barW * mpRatio, barH, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(`MP ${this.stats.mp}/${this.stats.maxMp}`, x + 4, y + 41);

    // Score display
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Score: ${this.score}`, x + barW + 20, y + 20);
    
    // Enemies defeated
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Kills: ${this.enemiesDefeated}`, x + barW + 20, y + 36);
  }
}
