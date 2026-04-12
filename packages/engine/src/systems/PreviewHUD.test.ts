/**
 * @clawgame/engine - PreviewHUD tests
 *
 * Validates that the HUD renderer draws without error for various states
 * and produces expected canvas operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PreviewHUD, type HUDState, type MinimapEntity, type HUDSpell, type HUDTowerDefenseStats } from './PreviewHUD';
import { type RendererConfig } from '../types';

// ─── Helpers ───

function createMockCtx(): CanvasRenderingContext2D {
  const methods = [
    'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse',
    'fill', 'stroke', 'save', 'restore', 'translate', 'rotate',
    'scale', 'rect', 'drawImage', 'createRadialGradient',
    'quadraticCurveTo',
  ];
  const ctx: any = {};
  for (const m of methods) {
    ctx[m] = (...args: any[]) => {};
  }
  ctx.fillStyle = '';
  ctx.strokeStyle = '';
  ctx.lineWidth = 1;
  ctx.font = '';
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.shadowColor = '';
  ctx.shadowBlur = 0;
  // Mock roundRect
  ctx.roundRect = function(x: number, y: number, w: number, h: number, r: number) {
    ctx.rect(x, y, w, h);
  };
  // createRadialGradient returns mock
  ctx.createRadialGradient = () => ({ addColorStop: (...args: any[]) => {} });
  return ctx as CanvasRenderingContext2D;
}

function createDefaultHUDState(overrides: Partial<HUDState> = {}): HUDState {
  return {
    score: 100,
    health: 80,
    maxHealth: 100,
    mana: 60,
    maxMana: 100,
    fps: 60,
    entityCount: 10,
    timeSeconds: 42,
    collectedRunes: 3,
    spells: [],
    ...overrides,
  };
}

function createDefaultConfig(): RendererConfig {
  return { width: 800, height: 600 };
}

describe('PreviewHUD', () => {
  let ctx: CanvasRenderingContext2D;
  let config: RendererConfig;

  beforeEach(() => {
    ctx = createMockCtx();
    config = createDefaultConfig();
  });

  describe('constructor', () => {
    it('creates a HUD renderer without error', () => {
      expect(() => new PreviewHUD(ctx, config)).not.toThrow();
    });
  });

  describe('render', () => {
    it('renders basic HUD state without error', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState();

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with minimap entities', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState();
      const entities: MinimapEntity[] = [
        { x: 100, y: 200, type: 'player' },
        { x: 300, y: 400, type: 'enemy' },
        { x: 500, y: 100, type: 'collectible' },
      ];

      expect(() => hud.render(state, entities)).not.toThrow();
    });

    it('renders with spells', () => {
      const hud = new PreviewHUD(ctx, config);
      const spells: HUDSpell[] = [
        { icon: '🔥', hotkey: 1, cooldown: 0, maxCooldown: 5 },
        { icon: '❄️', hotkey: 2, cooldown: 2.5, maxCooldown: 5 },
        { icon: '⚡', hotkey: 3, cooldown: 0, maxCooldown: 3 },
      ];
      const state = createDefaultHUDState({ spells });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with quest text', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState({ questText: 'Find the golden rune' });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with tower defense stats', () => {
      const hud = new PreviewHUD(ctx, config);
      const td: HUDTowerDefenseStats = {
        waveIndex: 3,
        totalWaves: 10,
        towerCount: 5,
        enemiesAlive: 12,
        coreHealth: 80,
        coreMaxHealth: 100,
      };
      const state = createDefaultHUDState({ towerDefense: td });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with tower defense wave message', () => {
      const hud = new PreviewHUD(ctx, config);
      const td: HUDTowerDefenseStats = {
        waveIndex: 3,
        totalWaves: 10,
        towerCount: 5,
        enemiesAlive: 12,
        coreHealth: 80,
        coreMaxHealth: 100,
        waveMessage: 'Wave 3 incoming!',
        waveMessageAlpha: 0.8,
      };
      const state = createDefaultHUDState({ towerDefense: td });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with weapon name', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState({ weaponName: 'Flame Sword' });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with zero health', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState({ health: 0 });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders with full mana', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState({ mana: 100 });

      expect(() => hud.render(state, [])).not.toThrow();
    });

    it('renders empty state (no spells, no quest, no TD)', () => {
      const hud = new PreviewHUD(ctx, config);
      const state: HUDState = {
        score: 0,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        fps: 0,
        entityCount: 0,
        timeSeconds: 0,
        collectedRunes: 0,
        spells: [],
      };

      expect(() => hud.render(state, [])).not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('updates config without error', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState();

      hud.updateConfig({ width: 1024, height: 768 });
      expect(() => hud.render(state, [])).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('destroys without error', () => {
      const hud = new PreviewHUD(ctx, config);
      expect(() => hud.destroy()).not.toThrow();
    });
  });

  describe('minimap entity types', () => {
    it('renders all entity type colors', () => {
      const hud = new PreviewHUD(ctx, config);
      const state = createDefaultHUDState();
      const entities: MinimapEntity[] = [
        { x: 100, y: 100, type: 'player' },
        { x: 200, y: 200, type: 'enemy' },
        { x: 300, y: 300, type: 'collectible' },
        { x: 400, y: 400, type: 'obstacle' },
        { x: 500, y: 500, type: 'npc' },
        { x: 600, y: 600, type: 'unknown' },
        { x: 700, y: 100, type: 'custom-type' },
      ];

      expect(() => hud.render(state, entities)).not.toThrow();
    });
  });
});
