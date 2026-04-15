/**
 * @clawgame/web - Dungeon Minimap Component
 * A small top-down map overlay showing the player, enemies, runes, and walls.
 * Positioned in the bottom-right of the game HUD.
 */

import React, { useRef, useEffect } from 'react';

export interface MinimapEntity {
  id: string;
  type: 'enemy' | 'rune' | 'npc' | 'player';
  x: number;
  y: number;
  color: string;
  active: boolean;
}

export interface DungeonMinimapProps {
  /** Current player world position */
  playerX: number;
  playerY: number;
  /** World-space entities to render on the minimap */
  entities: MinimapEntity[];
  /** World bounds (width x height) */
  worldWidth: number;
  worldHeight: number;
  /** Canvas pixel size of the minimap */
  size?: number;
  /** Whether to show wall/terrain grid */
  showGrid?: boolean;
}

const DOT_RADIUS: Record<string, number> = {
  player: 4,
  enemy: 3,
  rune: 3,
  npc: 3,
};

const DOT_COLOR: Record<string, string> = {
  player: '#22c55e',
  enemy: '#ef4444',
  rune: '#a855f7',
  npc: '#3b82f6',
};

export function DungeonMinimap({
  playerX,
  playerY,
  entities,
  worldWidth,
  worldHeight,
  size = 120,
  showGrid = true,
}: DungeonMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Re-draw whenever player position or entities change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Minimap shows a viewport window around the player
    const VIEW_SIZE = Math.min(worldWidth, worldHeight, 800); // world units visible on minimap
    const scale = size / VIEW_SIZE;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background — dark dungeon floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Grid lines (subtle)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(71,85,105,0.35)';
      ctx.lineWidth = 0.5;
      const gridStep = 50 * scale;
      for (let x = 0; x < size; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      }
      for (let y = 0; y < size; y += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
      // Border
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, size, size);
    }

    // Helper: world → minimap canvas coords
    const toMap = (wx: number, wy: number) => {
      const dx = (wx - playerX + VIEW_SIZE / 2) * scale;
      const dy = (wy - playerY + VIEW_SIZE / 2) * scale;
      return { mx: dx, my: dy };
    };

    // Draw viewport boundary (what's currently on screen)
    ctx.strokeStyle = 'rgba(100,116,139,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(0, 0, size, size);
    ctx.setLineDash([]);

    // Draw collected runes first (dimmed — already collected)
    for (const e of entities) {
      if (e.type === 'rune') {
        const { mx, my } = toMap(e.x, e.y);
        if (mx < -5 || mx > size + 5 || my < -5 || my > size + 5) continue;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = DOT_COLOR.rune;
        ctx.beginPath();
        ctx.arc(mx, my, DOT_RADIUS.rune, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Draw enemies
    for (const e of entities) {
      if (e.type !== 'enemy' || !e.active) continue;
      const { mx, my } = toMap(e.x, e.y);
      if (mx < -5 || mx > size + 5 || my < -5 || my > size + 5) continue;
      ctx.fillStyle = DOT_COLOR.enemy;
      ctx.beginPath();
      ctx.arc(mx, my, DOT_RADIUS.enemy, 0, Math.PI * 2);
      ctx.fill();
      // Health ring
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, DOT_RADIUS.enemy + 2, 0, Math.PI * 2 * 0.7);
      ctx.stroke();
    }

    // Draw NPCs
    for (const e of entities) {
      if (e.type !== 'npc') continue;
      const { mx, my } = toMap(e.x, e.y);
      if (mx < -5 || mx > size + 5 || my < -5 || my > size + 5) continue;
      ctx.fillStyle = DOT_COLOR.npc;
      ctx.beginPath();
      ctx.arc(mx, my, DOT_RADIUS.npc, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player (always at center, bright)
    ctx.fillStyle = DOT_COLOR.player;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, DOT_RADIUS.player, 0, Math.PI * 2);
    ctx.fill();
    // Player glow
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, DOT_RADIUS.player * 2);
    grd.addColorStop(0, 'rgba(34,197,94,0.4)');
    grd.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, DOT_RADIUS.player * 2, 0, Math.PI * 2);
    ctx.fill();

  }, [playerX, playerY, entities, worldWidth, worldHeight, size, showGrid]);

  return (
    <div
      title="Dungeon Minimap"
      style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        border: '2px solid #334155',
        boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
        zIndex: 100,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ display: 'block' }}
      />
    </div>
  );
}