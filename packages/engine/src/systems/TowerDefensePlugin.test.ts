/**
 * @clawgame/engine - TowerDefensePlugin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TowerDefensePlugin,
  createDefaultTDConfig,
  createDefaultTDState,
} from './TowerDefensePlugin';
import { type GameState, createDefaultGameState } from './GameLoopCoordinator';
import { type Scene, type Entity } from '../types';

function createMockScene(entities: Array<{ id: string; type: string; components: Record<string, any>; transform?: any }> = []): Scene {
  const map = new Map<string, Entity>();
  for (const e of entities) {
    const components = new Map<string, any>();
    for (const [k, v] of Object.entries(e.components)) {
      components.set(k, v);
    }
    map.set(e.id, {
      id: e.id,
      type: e.type as any,
      transform: e.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      components,
    } as any);
  }
  return { name: "test", entities: map };
}

function createDefaultState(overrides: Partial<GameState> = {}): GameState {
  return { ...createDefaultGameState(), ...overrides };
}

describe('TowerDefensePlugin', () => {
  let plugin: TowerDefensePlugin;
  let state: GameState;
  let scene: Scene;

  beforeEach(() => {
    plugin = new TowerDefensePlugin();
    state = createDefaultState();
    scene = createMockScene();
  });

  it('has correct genre identifier', () => {
    expect(plugin.genre).toBe('tower-defense');
  });

  describe('onStart', () => {
    it('initializes wave state', () => {
      plugin.onStart(state, scene);
      const td = plugin.getState();
      expect(td.waveIndex).toBe(0);
      expect(td.waveActive).toBe(false);
      expect(td.enemiesAlive).toBe(0);
      expect(td.enemiesSpawned).toBe(0);
      expect(td.waveMessage).toBe('Wave 1 incoming!');
    });
  });

  describe('onUpdate', () => {
    it('regenerates mana over time', () => {
      state.mana = 50;
      plugin.onStart(state, scene);
      const result = plugin.onUpdate(1000, state, scene);
      expect(result!.mana).toBeGreaterThan(50);
    });

    it('does not exceed max mana', () => {
      state.mana = 99;
      state.maxMana = 100;
      plugin.onStart(state, scene);
      const result = plugin.onUpdate(1000, state, scene);
      expect(result!.mana).toBeLessThanOrEqual(100);
    });

    it('counts enemies in scene', () => {
      scene = createMockScene([
        { id: 'e1', type: 'enemy', transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, components: { stats: { hp: 10, maxHp: 10 } } } as Entity,
        { id: 'e2', type: 'enemy', transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, components: { stats: { hp: 0, maxHp: 20 } } as Entity },
      ]);
      plugin.onStart(state, scene);
      plugin.onUpdate(0, state, scene);
      expect(plugin.getState().enemiesAlive).toBe(1);
    });

    it('starts wave after delay', () => {
      plugin.onStart(state, scene);
      plugin.onUpdate(3100, state, scene);
      expect(plugin.getState().waveActive).toBe(true);
    });

    it('spawns enemies during wave', () => {
      let spawned = false;
      plugin.setSpawnCallback(() => { spawned = true; });
      plugin.onStart(state, scene);
      plugin.onUpdate(3100, state, scene); // start wave
      plugin.onUpdate(100, state, scene); // spawn first
      expect(spawned).toBe(true);
      expect(plugin.getState().enemiesSpawned).toBe(1);
    });

    it('fades wave message over time', () => {
      plugin.onStart(state, scene);
      expect(plugin.getState().waveMessageTimer).toBe(3000);
      plugin.onUpdate(1000, state, scene);
      expect(plugin.getState().waveMessageTimer).toBeLessThan(3000);
    });

    it('counts towers in scene', () => {
      scene = createMockScene([
        { id: 't1', type: 'custom', transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, components: { tower: { level: 1 } } },
      ]);
      plugin.onStart(state, scene);
      plugin.onUpdate(0, state, scene);
      expect(plugin.getState().towerCount).toBe(1);
    });
  });

  describe('tower placement', () => {
    it('allows placement with enough mana', () => {
      expect(plugin.canPlaceTower(createDefaultTDConfig().towerCost)).toBe(true);
    });

    it('blocks placement with insufficient mana', () => {
      expect(plugin.canPlaceTower(10)).toBe(false);
    });

    it('deducts mana on placement', () => {
      const newMana = plugin.placeTower(50);
      expect(newMana).toBe(20);
    });
  });

  describe('victory conditions', () => {
    it('returns victory conditions', () => {
      const conds = plugin.getVictoryConditions();
      expect(conds).toHaveLength(1);
      expect(conds[0].type).toBe('custom');
    });

    it('not victorious at start', () => {
      plugin.onStart(state, scene);
      expect(plugin.checkVictory(state, scene)).toBe(false);
    });

    it('victorious when all waves done and no enemies', () => {
      plugin.onStart(state, scene);
      (plugin as any).tdState.waveIndex = 5;
      (plugin as any).tdState.enemiesAlive = 0;
      expect(plugin.checkVictory(state, scene)).toBe(true);
    });

    it('not victorious if enemies remain', () => {
      plugin.onStart(state, scene);
      (plugin as any).tdState.waveIndex = 5;
      (plugin as any).tdState.enemiesAlive = 3;
      expect(plugin.checkVictory(state, scene)).toBe(false);
    });
  });

  describe('wave completion', () => {
    it('completes wave and starts next delay', () => {
      plugin.setSpawnCallback(() => {});
      plugin.onStart(state, scene);
      plugin.onUpdate(3100, state, scene);

      const wave0 = createDefaultTDConfig().waves[0];
      (plugin as any).tdState.enemiesSpawned = wave0.enemyCount;
      (plugin as any).tdState.enemiesAlive = 0;
      scene = createMockScene();

      plugin.onUpdate(100, state, scene);
      expect(plugin.getState().waveActive).toBe(false);
      expect(plugin.getState().waveIndex).toBe(1);
    });

    it('shows victory message after final wave', () => {
      plugin.setSpawnCallback(() => {});
      plugin.onStart(state, scene);
      (plugin as any).tdState.waveIndex = 4;
      (plugin as any).tdState.waveActive = true;
      (plugin as any).tdState.enemiesSpawned = 20;
      (plugin as any).tdState.enemiesAlive = 0;
      plugin.onUpdate(100, state, scene);
      expect(plugin.getState().waveMessage).toBe('All waves cleared!');
    });
  });

  describe('getState / getConfig', () => {
    it('returns copies', () => {
      const s1 = plugin.getState();
      const s2 = plugin.getState();
      expect(s1).toEqual(s2);
      expect(s1).not.toBe(s2);
    });

    it('returns config copies', () => {
      const c1 = plugin.getConfig();
      const c2 = plugin.getConfig();
      expect(c1).toEqual(c2);
      expect(c1).not.toBe(c2);
    });
  });

  describe('custom config', () => {
    it('merges partial config', () => {
      const p = new TowerDefensePlugin({ towerCost: 50 });
      expect(p.getConfig().towerCost).toBe(50);
      expect(p.getConfig().towerRange).toBe(150);
    });

    it('merges partial state', () => {
      const p = new TowerDefensePlugin({}, { waveIndex: 3 });
      expect(p.getState().waveIndex).toBe(3);
    });
  });
});
