/**
 * Eclipse of Runes — Particle System
 * Juicy particles for hits, pickups, death, trails, and screen shake.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shrink: boolean;
  fadeOut: boolean;
  rotation: number;
  rotSpeed: number;
  shape: 'circle' | 'square' | 'star' | 'line';
}

export class ParticleSystem {
  private particles: Particle[] = [];

  emit(opts: Partial<Particle> & { x: number; y: number }): void {
    this.particles.push({
      vx: 0, vy: 0, life: 1, maxLife: 1, size: 3,
      color: '#fff', gravity: 0, shrink: true, fadeOut: true,
      rotation: 0, rotSpeed: 0, shape: 'circle',
      ...opts,
    });
  }

  burst(x: number, y: number, count: number, color: string, opts?: Partial<Particle>): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 120;
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color,
        gravity: 80,
        shrink: true,
        fadeOut: true,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
        ...opts,
      });
    }
  }

  sparkle(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      this.emit({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.3 + Math.random() * 0.4,
        size: 1 + Math.random() * 3,
        color,
        gravity: 20,
        shrink: true,
        fadeOut: true,
        rotation: 0,
        rotSpeed: 0,
        shape: 'star',
      });
    }
  }

  deathExplosion(x: number, y: number, color: string): void {
    // Big burst
    this.burst(x, y, 20, color, { size: 3 + Math.random() * 5, life: 0.6, maxLife: 0.6 });
    // Extra sparkles
    this.sparkle(x, y, 12, '#fff');
    // Screen shake effect handled in game.ts
  }

  trail(x: number, y: number, color: string): void {
    this.emit({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.2 + Math.random() * 0.15,
      maxLife: 0.35,
      size: 2 + Math.random() * 2,
      color,
      gravity: 0,
      shrink: true,
      fadeOut: true,
      rotation: 0,
      rotSpeed: 0,
      shape: 'circle',
    });
  }

  damageNumber(x: number, y: number, amount: number, color: string = '#ff4444'): void {
    // We handle damage numbers separately in game.ts via the notification system
    this.emit({
      x,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -60,
      life: 0.8,
      maxLife: 0.8,
      size: amount,
      color,
      gravity: 40,
      shrink: false,
      fadeOut: true,
      rotation: 0,
      rotSpeed: 0,
      shape: 'line', // special: we render these as text in the game
    });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotSpeed * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.particles) {
      const alpha = p.fadeOut ? p.life / p.maxLife : 1;
      const size = p.shrink ? p.size * (p.life / p.maxLife) : p.size;
      const sx = p.x - camX;
      const sy = p.y - camY;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-size / 2, -size / 2, size, size);
      } else if (p.shape === 'star') {
        this.drawStar(ctx, 0, 0, 4, size, size / 2);
      }

      ctx.restore();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number): void {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  get count(): number { return this.particles.length; }
}

/**
 * Screen shake effect
 */
export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;

  shake(intensity: number, duration: number): void {
    // Only override if new shake is stronger
    if (intensity > this.intensity) {
      this.intensity = intensity;
      this.duration = duration;
      this.elapsed = 0;
    }
  }

  update(dt: number): { x: number; y: number } {
    if (this.elapsed >= this.duration) {
      this.intensity = 0;
      return { x: 0, y: 0 };
    }
    this.elapsed += dt;
    const t = this.elapsed / this.duration;
    const decay = 1 - t;
    return {
      x: (Math.random() - 0.5) * 2 * this.intensity * decay,
      y: (Math.random() - 0.5) * 2 * this.intensity * decay,
    };
  }

  get active(): boolean { return this.elapsed < this.duration; }
}

/**
 * Floating damage/heal numbers
 */
export interface FloatingText {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  bold: boolean;
}

export class FloatingTextSystem {
  private texts: FloatingText[] = [];

  add(text: string, x: number, y: number, color: string = '#fff', size: number = 12, bold: boolean = true): void {
    this.texts.push({
      text, x, y, vy: -40, life: 1.0, maxLife: 1.0, color, size, bold,
    });
  }

  update(dt: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 0.95;
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const t of this.texts) {
      const alpha = Math.min(1, t.life / t.maxLife * 2);
      const sx = t.x - camX;
      const sy = t.y - camY;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = `${t.bold ? 'bold ' : ''}${t.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(t.text, sx + 1, sy + 1);
      // Text
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
      ctx.restore();
    }
  }
}
