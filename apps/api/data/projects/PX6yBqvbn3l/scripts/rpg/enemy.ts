/**
 * Eclipse of Runes — Enemy NPC
 * Patrol/chase AI with attack behavior, death animations, and knockback.
 */

import { TilemapEngine } from './tilemap';
import { Player } from './player';
import { ParticleSystem, ScreenShake, FloatingTextSystem } from './particles';

export interface EnemyDef {
  id: string;
  x: number;
  y: number;
  type: 'slime' | 'skeleton' | 'wisp';
  patrolPoints?: Array<{ x: number; y: number }>;
  aggroRange?: number;
  speed?: number;
  hp?: number;
  damage?: number;
}

export class Enemy {
  public id: string;
  public x: number;
  public y: number;
  public width = 24;
  public height = 24;
  public type: 'slime' | 'skeleton' | 'wisp';

  // Movement
  private speed: number;
  private vx = 0;
  private vy = 0;
  private facing: 'left' | 'right' = 'left';

  // Patrol
  private patrolPoints: Array<{ x: number; y: number }>;
  private patrolIndex = 0;
  private patrolWait = 0;

  // Aggro
  private aggroRange: number;
  private state: 'patrol' | 'chase' | 'idle' = 'patrol';

  // Combat
  public hp: number;
  public maxHp: number;
  public alive = true;
  private damage: number;
  private attackCooldown = 0;
  private attackRate = 1.2; // seconds between attacks
  
  // Death animation
  private deathTimer = 0;
  private deathDuration = 0.4;
  public isDying = false;

  // Knockback
  private knockbackVx = 0;
  private knockbackVy = 0;
  private knockbackDecay = 8;

  // Animation
  private animFrame = 0;
  private animTimer = 0;
  
  // Hit flash
  private hitFlash = 0;

  // External systems (set by game)
  public particles: ParticleSystem | null = null;
  public screenShake: ScreenShake | null = null;
  public floatingText: FloatingTextSystem | null = null;

  constructor(def: EnemyDef) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.type = def.type;
    this.speed = def.speed ?? 45;
    this.aggroRange = def.aggroRange ?? 100;
    this.hp = def.hp ?? 30;
    this.maxHp = this.hp;
    this.damage = def.damage ?? 10;
    this.patrolPoints = def.patrolPoints ?? [];
    if (this.patrolPoints.length === 0) {
      this.state = 'idle';
    }
  }

  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }
  get attackDamage(): number { return this.damage; }

  update(dt: number, tilemap: TilemapEngine, player: Player): void {
    if (!this.alive) return;
    
    if (this.isDying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.alive = false;
      }
      return;
    }

    // Update hit flash
    if (this.hitFlash > 0) this.hitFlash -= dt * 5;

    // Update attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Apply knockback decay
    this.knockbackVx *= Math.pow(0.1, dt * this.knockbackDecay);
    this.knockbackVy *= Math.pow(0.1, dt * this.knockbackDecay);

    const distToPlayer = Math.hypot(
      player.centerX - this.centerX,
      player.centerY - this.centerY
    );

    // State transitions
    if (distToPlayer < this.aggroRange && !player.isInvincible) {
      this.state = 'chase';
    } else if (this.state === 'chase' && distToPlayer > this.aggroRange * 1.8) {
      this.state = 'patrol';
    }

    // Wait at waypoint
    if (this.patrolWait > 0) {
      this.patrolWait -= dt;
      this.vx = 0;
      this.vy = 0;
      this.applyKnockbackMovement(dt, tilemap);
      return;
    }

    let targetX: number;
    let targetY: number;

    if (this.state === 'chase') {
      targetX = player.centerX;
      targetY = player.centerY;
    } else if (this.state === 'patrol' && this.patrolPoints.length > 0) {
      const pt = this.patrolPoints[this.patrolIndex];
      targetX = pt.x;
      targetY = pt.y;
    } else {
      this.animTimer += dt;
      this.applyKnockbackMovement(dt, tilemap);
      return;
    }

    // Move toward target
    const dx = targetX - this.centerX;
    const dy = targetY - this.centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      if (this.state === 'patrol') {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
        this.patrolWait = 0.8 + Math.random() * 0.8;
      }
      this.vx = 0;
      this.vy = 0;
      this.applyKnockbackMovement(dt, tilemap);
      return;
    }

    const moveSpeed = this.state === 'chase' ? this.speed * 1.3 : this.speed;
    this.vx = (dx / dist) * moveSpeed;
    this.vy = (dy / dist) * moveSpeed;

    if (this.vx > 0) this.facing = 'right';
    else if (this.vx < 0) this.facing = 'left';

    // Apply movement with collision + knockback
    const totalVx = this.vx + this.knockbackVx;
    const totalVy = this.vy + this.knockbackVy;
    
    const newX = this.x + totalVx * dt;
    if (!tilemap.isBoxBlocked(newX, this.y, this.width, this.height)) {
      this.x = newX;
    }
    const newY = this.y + totalVy * dt;
    if (!tilemap.isBoxBlocked(this.x, newY, this.width, this.height)) {
      this.y = newY;
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  private applyKnockbackMovement(dt: number, tilemap: TilemapEngine): void {
    const newX = this.x + this.knockbackVx * dt;
    if (!tilemap.isBoxBlocked(newX, this.y, this.width, this.height)) {
      this.x = newX;
    }
    const newY = this.y + this.knockbackVy * dt;
    if (!tilemap.isBoxBlocked(this.x, newY, this.width, this.height)) {
      this.y = newY;
    }
  }

  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    if (!this.alive || this.isDying) return false;
    return this.x < px + pw && this.x + this.width > px &&
           this.y < py + ph && this.y + this.height > py;
  }

  canAttack(): boolean {
    return this.alive && !this.isDying && this.attackCooldown <= 0 && this.state === 'chase';
  }

  performAttack(): void {
    this.attackCooldown = this.attackRate;
  }

  takeDamage(amount: number, knockbackX: number = 0, knockbackY: number = 0): void {
    if (this.isDying) return;
    
    this.hp -= amount;
    this.hitFlash = 1;
    this.knockbackVx = knockbackX;
    this.knockbackVy = knockbackY;

    // Show damage number
    if (this.floatingText) {
      this.floatingText.add(`-${amount}`, this.centerX, this.y - 5, '#ff6b6b', 14, true);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private die(): void {
    this.isDying = true;
    this.deathTimer = this.deathDuration;

    // Death particles
    if (this.particles) {
      const color = this.type === 'slime' ? '#22c55e' : 
                    this.type === 'wisp' ? '#a855f7' : '#e8e8e8';
      this.particles.deathExplosion(this.centerX, this.centerY, color);
    }

    // Screen shake
    if (this.screenShake) {
      this.screenShake.shake(4, 0.2);
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (!this.alive && !this.isDying) return;
    
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Death animation - shrink and fade
    if (this.isDying) {
      const deathProgress = 1 - this.deathTimer / this.deathDuration;
      const scale = 1 - deathProgress * 0.5;
      const alpha = 1 - deathProgress;
      ctx.globalAlpha = alpha;
      ctx.translate(sx + w / 2, sy + h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(sx + w / 2), -(sy + h / 2));
    }

    // Hit flash (white overlay)
    if (this.hitFlash > 0) {
      ctx.filter = `brightness(${1 + this.hitFlash})`;
    }

    const bob = Math.sin(this.animFrame * Math.PI / 2) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h + 3, w / 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'slime') {
      const squish = 1 + Math.sin(this.animFrame * Math.PI / 2) * 0.12;
      const baseColor = this.state === 'chase' ? '#dc2626' : '#22c55e';
      
      // Body
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + h - 8 + bob, (w / 2) * squish, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(sx + w / 2 - 3, sy + h - 12 + bob, 4, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx + 6, sy + h - 12 + bob, 5, 5);
      ctx.fillRect(sx + w - 11, sy + h - 12 + bob, 5, 5);
      ctx.fillStyle = '#000';
      const eyeOff = this.facing === 'right' ? 2 : 0;
      ctx.fillRect(sx + 6 + eyeOff, sy + h - 11 + bob, 3, 3);
      ctx.fillRect(sx + w - 11 + eyeOff, sy + h - 11 + bob, 3, 3);
      
    } else if (this.type === 'skeleton') {
      // Body
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(sx + 6, sy + 6, w - 12, h - 10);
      
      // Skull
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.arc(sx + w / 2, sy + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye sockets
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(sx + 8, sy + 5, 3, 4);
      ctx.fillRect(sx + w - 11, sy + 5, 3, 4);
      
      // Glowing red pupils when chasing
      if (this.state === 'chase') {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(sx + 9, sy + 6, 2, 2);
        ctx.fillRect(sx + w - 10, sy + 6, 2, 2);
      }
      
      // Ribs
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + 12 + i * 4);
        ctx.lineTo(sx + w - 8, sy + 12 + i * 4);
        ctx.stroke();
      }
      
    } else if (this.type === 'wisp') {
      const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 200);
      const baseAlpha = this.state === 'chase' ? 1 : 0.7;
      
      // Outer glow
      ctx.fillStyle = `rgba(147, 51, 234, ${pulse * 0.5 * baseAlpha})`;
      ctx.beginPath();
      ctx.arc(sx + w / 2, sy + h / 2 + bob, w / 2 + 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = `rgba(216, 180, 254, ${(pulse * 0.6 + 0.4) * baseAlpha})`;
      ctx.beginPath();
      ctx.arc(sx + w / 2, sy + h / 2 + bob, w / 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner bright spot
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse * baseAlpha})`;
      ctx.beginPath();
      ctx.arc(sx + w / 2 - 2, sy + h / 2 - 2 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Trail wisps
      for (let i = 0; i < 3; i++) {
        const trail = (performance.now() / 100 + i * 2) % (Math.PI * 2);
        const tx = sx + w / 2 + Math.cos(trail) * 8;
        const ty = sy + h / 2 + Math.sin(trail) * 6 + bob;
        ctx.fillStyle = `rgba(167, 139, 250, ${0.3 * baseAlpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.filter = 'none';
    ctx.restore();

    // HP bar (only when damaged)
    if (this.hp < this.maxHp && !this.isDying) {
      const barW = w;
      const barH = 3;
      const ratio = this.hp / this.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(sx, sy - 8, barW, barH);
      ctx.fillStyle = ratio > 0.3 ? '#ef4444' : '#ff0000';
      ctx.fillRect(sx, sy - 8, barW * ratio, barH);
    }

    // Aggro indicator
    if (this.state === 'chase' && !this.isDying) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      const exclaim = Math.sin(performance.now() / 100) > 0 ? '!' : '';
      ctx.fillText(exclaim, sx + w / 2, sy - 10);
      ctx.textAlign = 'left';
    }
  }
}
