/**
 * @clawgame/web - Game Loop Hook
 * Manages the game loop (update + render) for the preview.
 * Decoupled from RPG UI state — receives entity state via refs.
 */

import { useRef, useCallback, useEffect } from 'react';

// ── Types ──

export interface Entity {
  id: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  color: string;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  state: 'idle' | 'moving' | 'attacking' | 'hurt' | 'dying' | 'dead';
  animTimer: number;
  animFrame: number;
  facingRight: boolean;
  attackCooldown: number;
  isSpell?: boolean;
  value?: number;
  startX?: number;
  direction?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  owner: string;
  isSpell: boolean;
  color: string;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameLoopCallbacks {
  onUpdate: (dt: number, entities: Map<string, Entity>, projectiles: Projectile[], particles: Particle[], keys: Set<string>) => void;
  onRender: (ctx: CanvasRenderingContext2D, entities: Map<string, Entity>, projectiles: Projectile[], particles: Particle[]) => void;
  onGameEvent?: (event: string, data: any) => void;
}

export interface GameLoopControls {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
}

export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  callbacks: GameLoopCallbacks,
) {
  const entitiesRef = useRef<Map<string, Entity>>(new Map());
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const runningRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // ── Keyboard ──

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      // Prevent scrolling during game play
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Loop ──

  const tick = useCallback((timestamp: number) => {
    if (!runningRef.current) return;

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    // Update
    callbacksRef.current.onUpdate(
      dt,
      entitiesRef.current,
      projectilesRef.current,
      particlesRef.current,
      keysRef.current,
    );

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        callbacksRef.current.onRender(ctx, entitiesRef.current, projectilesRef.current, particlesRef.current);
      }
    }

    animationRef.current = requestAnimationFrame(tick);
  }, [canvasRef]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return {
    entities: entitiesRef,
    projectiles: projectilesRef,
    particles: particlesRef,
    keys: keysRef,
    start,
    stop,
    isRunning: runningRef.current,
  };
}

// ── Render helpers ──

export function renderEntity(ctx: CanvasRenderingContext2D, e: Entity) {
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  if (e.rotation) ctx.rotate((e.rotation * Math.PI) / 180);
  if (e.scale !== 1) ctx.scale(e.scale, e.scale);

  // Hurt flash
  if (e.state === 'hurt' && e.animTimer > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(e.animTimer * 20) * 0.3;
  }

  // Death fade
  if (e.state === 'dying' || e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, (e.animTimer || 0) / 0.5);
  }

  const halfW = e.width / 2;
  const halfH = e.height / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, halfH + 2, halfW * 0.8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = e.color;
  ctx.fillRect(-halfW, -halfH, e.width, e.height);

  // Outline
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-halfW, -halfH, e.width, e.height);

  // Type-specific decorations
  if (e.type === 'player') {
    renderPlayerDecorations(ctx, e, halfW, halfH);
  } else if (e.type === 'enemy') {
    renderEnemyDecorations(ctx, e, halfW, halfH);
  } else if (e.type === 'collectible') {
    renderCollectibleDecorations(ctx, e, halfW, halfH);
  } else if (e.type === 'obstacle') {
    // Simple block, no decorations
  }

  // Health bar
  if (e.maxHealth > 0 && e.health < e.maxHealth && e.type !== 'collectible' && e.type !== 'obstacle') {
    const barW = e.width;
    const barH = 4;
    const barY = -halfH - 10;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    const pct = e.health / e.maxHealth;
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(-barW / 2, barY, barW * pct, barH);
  }

  ctx.restore();
}

function renderPlayerDecorations(ctx: CanvasRenderingContext2D, e: Entity, halfW: number, halfH: number) {
  // Eyes
  const eyeY = -halfH * 0.3;
  const eyeSpacing = halfW * 0.35;
  const eyeR = 2.5;
  const facingOffset = e.facingRight ? 2 : -2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-eyeSpacing + facingOffset, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeSpacing + facingOffset, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(-eyeSpacing + facingOffset * 1.2, eyeY, 1.2, 0, Math.PI * 2);
  ctx.arc(eyeSpacing + facingOffset * 1.2, eyeY, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Attack indicator
  if (e.state === 'attacking') {
    const dir = e.facingRight ? 1 : -1;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(halfW * dir, -halfH * 0.5);
    ctx.lineTo(halfW * dir + 12 * dir, -halfH * 0.2);
    ctx.lineTo(halfW * dir + 12 * dir, halfH * 0.2);
    ctx.stroke();
  }
}

function renderEnemyDecorations(ctx: CanvasRenderingContext2D, e: Entity, halfW: number, halfH: number) {
  // Angry eyes
  const eyeY = -halfH * 0.3;
  const eyeSpacing = halfW * 0.3;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(-eyeSpacing, eyeY, 3, 0, Math.PI * 2);
  ctx.arc(eyeSpacing, eyeY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Angry eyebrows
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-eyeSpacing - 3, eyeY - 5);
  ctx.lineTo(-eyeSpacing + 3, eyeY - 3);
  ctx.moveTo(eyeSpacing + 3, eyeY - 5);
  ctx.lineTo(eyeSpacing - 3, eyeY - 3);
  ctx.stroke();
}

function renderCollectibleDecorations(ctx: CanvasRenderingContext2D, e: Entity, halfW: number, halfH: number) {
  // Glow effect
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW * 1.5);
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(-halfW * 1.5, -halfH * 1.5, halfW * 3, halfH * 3);

  // Star/diamond shape
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(halfW * 0.5, 0);
  ctx.lineTo(0, halfH);
  ctx.lineTo(-halfW * 0.5, 0);
  ctx.closePath();
  ctx.fill();

  // Sparkle
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(halfW * 0.15, -halfH * 0.15, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

export function renderProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
  ctx.save();
  ctx.shadowColor = p.isSpell ? '#a855f7' : p.color;
  ctx.shadowBlur = p.isSpell ? 15 : 10;
  ctx.fillStyle = p.isSpell ? '#c084fc' : p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
  ctx.fill();

  // Trail
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.width / 2 * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(p.x - p.vx * 0.04, p.y - p.vy * 0.04, p.width / 2 * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function renderParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  ctx.restore();
}
