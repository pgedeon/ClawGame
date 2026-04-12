/**
 * @clawgame/engine - GameLoopCoordinator tests
 *
 * Validates game state tracking, events, victory/defeat conditions,
 * genre plugin hooks, and collectible pickup flows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoopCoordinator, createDefaultGameState, type GenrePlugin, type GameState, type VictoryCondition } from './GameLoopCoordinator';
import { EventBus } from '../EventBus';
import { type Scene, type Entity, type CollectibleComponent, type StatsComponent } from '../types';

// ─── Helpers ───

function createMockScene(entityCount = 0): Scene {
  const entities = new Map<string, Entity>();
  for (let i = 0; i < entityCount; i++) {
    const collectible: CollectibleComponent = {
      type: 'rune',
      value: 10,
      name: `rune-${i}`,
    };
    const entity: Entity = {
      id: `entity-${i}`,
      name: `Rune ${i}`,
      type: 'collectible',
      transform: { x: i * 50, y: 0 },
      components: new Map([['collectible', collectible]]),
    };
    entities.set(entity.id, entity);
  }
  return { name: 'test-scene', entities };
}

describe('GameLoopCoordinator', () => {
  let coordinator: GameLoopCoordinator;
  let eventBus: EventBus;

  beforeEach(() => {
    coordinator = new GameLoopCoordinator();
    eventBus = new EventBus();
    coordinator.attach(eventBus);
  });

  // ─── Basic State Tracking ───

  describe('initial state', () => {
    it('starts with default game state', () => {
      const state = coordinator.getState();
      expect(state.score).toBe(0);
      expect(state.health).toBe(100);
      expect(state.mana).toBe(100);
      expect(state.maxHealth).toBe(100);
      expect(state.maxMana).toBe(100);
      expect(state.collectedItems).toEqual([]);
      expect(state.timeElapsed).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.isVictory).toBe(false);
      expect(state.isPaused).toBe(false);
    });

    it('accepts custom initial state', () => {
      const coord = new GameLoopCoordinator({
        initialState: { health: 50, mana: 30, score: 100 },
      });
      const state = coord.getState();
      expect(state.health).toBe(50);
      expect(state.mana).toBe(30);
      expect(state.score).toBe(100);
    });
  });

  describe('createDefaultGameState', () => {
    it('returns a fresh default state', () => {
      const state = createDefaultGameState();
      expect(state.score).toBe(0);
      expect(state.health).toBe(100);
      expect(state.isGameOver).toBe(false);
    });
  });

  // ─── Score ───

  describe('score tracking', () => {
    it('adds score and emits event', () => {
      const listener = vi.fn();
      eventBus.on('game:score-changed', listener);

      coordinator.addScore(50);

      expect(coordinator.getState().score).toBe(50);
      expect(listener).toHaveBeenCalledWith({
        oldScore: 0,
        newScore: 50,
        delta: 50,
      });
    });

    it('sets score absolutely and emits event', () => {
      coordinator.addScore(30);
      const listener = vi.fn();
      eventBus.on('game:score-changed', listener);

      coordinator.setScore(100);

      expect(coordinator.getState().score).toBe(100);
      expect(listener).toHaveBeenCalledWith({
        oldScore: 30,
        newScore: 100,
        delta: 70,
      });
    });

    it('does not add score when game is over', () => {
      coordinator.start();
      coordinator.applyDamage(999);
      expect(coordinator.getState().isGameOver).toBe(true);

      coordinator.addScore(50);
      expect(coordinator.getState().score).toBe(0);
    });
  });

  // ─── Health ───

  describe('health tracking', () => {
    it('applies damage and emits event', () => {
      const listener = vi.fn();
      eventBus.on('game:health-changed', listener);

      coordinator.applyDamage(20);

      expect(coordinator.getState().health).toBe(80);
      expect(listener).toHaveBeenCalledWith({
        oldHealth: 100,
        newHealth: 80,
        delta: -20,
      });
    });

    it('respects invincibility frames', () => {
      coordinator.applyDamage(20);
      expect(coordinator.getState().health).toBe(80);

      // Second hit within invincibility window
      coordinator.applyDamage(20);
      expect(coordinator.getState().health).toBe(80); // unchanged
    });
    it('allows damage after invincibility wears off', () => {
      coordinator.applyDamage(20);

      // Must start so update() ticks the invincibility timer
      coordinator.start(createMockScene());
      coordinator.update(0.6);

      coordinator.applyDamage(20);
      expect(coordinator.getState().health).toBe(60);
    });











    it('heals and clamps to max health', () => {
      coordinator.applyDamage(50);
      coordinator.heal(30);

      expect(coordinator.getState().health).toBe(80);
    });

    it('does not exceed max health on heal', () => {
      coordinator.heal(999);
      expect(coordinator.getState().health).toBe(100);
    });

    it('sets health absolutely', () => {
      coordinator.setHealth(42);
      expect(coordinator.getState().health).toBe(42);
    });

    it('clamps health to [0, maxHealth]', () => {
      coordinator.setHealth(-10);
      expect(coordinator.getState().health).toBe(0);

      coordinator.setHealth(999);
      expect(coordinator.getState().health).toBe(100);
    });

    it('does not apply damage when game is over', () => {
      coordinator.start();
      coordinator.applyDamage(100);
      expect(coordinator.getState().isGameOver).toBe(true);

      coordinator.applyDamage(10);
      expect(coordinator.getState().health).toBe(0);
    });

    it('does not apply damage when victory', () => {
      // Use a victory condition that's easy to trigger
      const coord = new GameLoopCoordinator({
        victoryConditions: [{ type: 'score-threshold', targetScore: 10 }],
      });
      const bus = new EventBus();
      coord.attach(bus);
      coord.start(createMockScene());
      coord.addScore(10);
      coord.update(0.016, createMockScene());
      expect(coord.getState().isVictory).toBe(true);

      coord.applyDamage(50);
      expect(coord.getState().health).toBe(100);
    });
  });

  // ─── Mana ───

  describe('mana tracking', () => {
    it('uses mana and returns true', () => {
      const result = coordinator.useMana(30);
      expect(result).toBe(true);
      expect(coordinator.getState().mana).toBe(70);
    });

    it('rejects mana use when insufficient', () => {
      const result = coordinator.useMana(999);
      expect(result).toBe(false);
      expect(coordinator.getState().mana).toBe(100);
    });

    it('regenerates mana and clamps to max', () => {
      coordinator.useMana(50);
      coordinator.regenerateMana(30);
      expect(coordinator.getState().mana).toBe(80);
    });

    it('does not exceed max mana on regenerate', () => {
      coordinator.regenerateMana(999);
      expect(coordinator.getState().mana).toBe(100);
    });

    it('sets mana absolutely', () => {
      coordinator.setMana(42);
      expect(coordinator.getState().mana).toBe(42);
    });
  });

  // ─── Collectibles ───

  describe('collectible pickup', () => {
    it('tracks collected items', () => {
      coordinator.collectItem('rune-1', 'rune', 10);
      expect(coordinator.getState().collectedItems).toEqual(['rune-1']);
    });

    it('does not double-collect the same item', () => {
      coordinator.collectItem('rune-1', 'rune', 10);
      coordinator.collectItem('rune-1', 'rune', 10);
      expect(coordinator.getState().collectedItems).toEqual(['rune-1']);
      expect(coordinator.getState().score).toBe(10); // only one score add
    });

    it('emits collectible-pickup event', () => {
      const listener = vi.fn();
      eventBus.on('game:collectible-pickup', listener);

      coordinator.collectItem('coin-1', 'coin', 5);

      expect(listener).toHaveBeenCalledWith({
        itemId: 'coin-1',
        itemType: 'coin',
        value: 5,
        totalCollected: 1,
      });
    });

    it('auto-handles collision:pickup events from event bus', () => {
      eventBus.emit('collision:pickup' as any, {
        collectibleId: 'item-1',
        type: 'coin',
        value: 5,
      });

      expect(coordinator.getState().collectedItems).toContain('item-1');
      expect(coordinator.getState().score).toBe(5);
    });

    it('auto-handles collision:damage events from event bus', () => {
      eventBus.emit('collision:damage' as any, {
        playerId: 'player-1',
        enemyId: 'enemy-1',
        damage: 15,
      });

      expect(coordinator.getState().health).toBe(85);
    });
  });

  // ─── Game Over ───

  describe('game over', () => {
    it('triggers game over when health reaches zero', () => {
      const listener = vi.fn();
      eventBus.on('game:over', listener);

      coordinator.applyDamage(100);

      expect(coordinator.getState().isGameOver).toBe(true);
      expect(coordinator.getState().health).toBe(0);
      expect(listener).toHaveBeenCalledWith({
        finalScore: 0,
        timeElapsed: 0,
      });
    });

    it('triggers game over on any lethal damage', () => {
      coordinator.applyDamage(999);
      expect(coordinator.getState().health).toBe(0);
      expect(coordinator.getState().isGameOver).toBe(true);
    });
  });

  // ─── Victory ───

  describe('victory conditions', () => {
    it('triggers victory on score-threshold', () => {
      const coord = new GameLoopCoordinator({
        victoryConditions: [{ type: 'score-threshold', targetScore: 100 }],
      });
      const bus = new EventBus();
      coord.attach(bus);
      coord.start(createMockScene());

      const listener = vi.fn();
      bus.on('game:victory', listener);

      coord.addScore(100);
      coord.update(0.016, createMockScene());

      expect(coord.getState().isVictory).toBe(true);
      expect(listener).toHaveBeenCalled();
    });

    it('triggers victory on survive-time', () => {
      const coord = new GameLoopCoordinator({
        victoryConditions: [{ type: 'survive-time', targetTime: 5 }],
      });
      const bus = new EventBus();
      coord.attach(bus);
      coord.start(createMockScene());

      // Simulate 6 seconds passing
      for (let i = 0; i < 60; i++) {
        coord.update(0.1, createMockScene());
      }

      expect(coord.getState().isVictory).toBe(true);
    });
  });

  // ─── Genre Plugins ───

  describe('genre plugins', () => {
    it('registers and calls genre plugins', () => {
      const plugin: GenrePlugin = {
        genre: 'tower-defense',
        onStart: vi.fn(),
        onUpdate: vi.fn(),
        onCollectiblePickup: vi.fn(),
        onHealthChanged: vi.fn(),
        reset: vi.fn(),
      };

      coordinator.registerGenrePlugin(plugin);

      const scene = createMockScene();
      coordinator.start(scene);

      expect(plugin.onStart).toHaveBeenCalledWith(expect.any(Object), scene);

      coordinator.update(0.016, scene);
      expect(plugin.onUpdate).toHaveBeenCalledWith(0.016, expect.any(Object), scene);
    });

    it('notifies plugin on collectible pickup', () => {
      const plugin: GenrePlugin = {
        genre: 'rpg',
        onCollectiblePickup: vi.fn(),
      };

      coordinator.registerGenrePlugin(plugin);
      coordinator.collectItem('gem-1', 'gem', 25);

      expect(plugin.onCollectiblePickup).toHaveBeenCalledWith('gem-1', 'gem', 25, expect.any(Object));
    });

    it('notifies plugin on health change', () => {
      const plugin: GenrePlugin = {
        genre: 'rpg',
        onHealthChanged: vi.fn(),
      };

      coordinator.registerGenrePlugin(plugin);
      coordinator.applyDamage(20);

      expect(plugin.onHealthChanged).toHaveBeenCalledWith(80, 100, expect.any(Object));
    });

    it('uses genre plugin custom victory check', () => {
      const plugin: GenrePlugin = {
        genre: 'custom',
        checkVictory: vi.fn().mockReturnValue(true),
      };

      const coord = new GameLoopCoordinator({
        victoryConditions: [{ type: 'custom' }],
      });
      const bus = new EventBus();
      coord.attach(bus);
      coord.registerGenrePlugin(plugin);

      const scene = createMockScene();
      coord.start(scene);
      coord.addScore(1);
      coord.update(0.016, scene);

      expect(plugin.checkVictory).toHaveBeenCalled();
      expect(coord.getState().isVictory).toBe(true);
    });

    it('uses genre plugin custom defeat check', () => {
      const plugin: GenrePlugin = {
        genre: 'custom',
        checkDefeat: vi.fn().mockReturnValue(true),
      };

      const coord = new GameLoopCoordinator();
      const bus = new EventBus();
      coord.attach(bus);
      coord.registerGenrePlugin(plugin);

      const scene = createMockScene();
      coord.start(scene);
      coord.update(0.016, scene);

      expect(plugin.checkDefeat).toHaveBeenCalled();
      expect(coord.getState().isGameOver).toBe(true);
    });

    it('resets genre plugins', () => {
      const plugin: GenrePlugin = {
        genre: 'test',
        reset: vi.fn(),
      };

      coordinator.registerGenrePlugin(plugin);
      coordinator.reset();

      expect(plugin.reset).toHaveBeenCalled();
    });
  });

  // ─── Update Loop ───

  describe('update loop', () => {
    it('advances time', () => {
      coordinator.start(createMockScene());
      coordinator.update(0.5);
      coordinator.update(0.5);

      expect(coordinator.getState().timeElapsed).toBeCloseTo(1.0, 5);
    });

    it('does not advance when not started', () => {
      coordinator.update(1.0);
      expect(coordinator.getState().timeElapsed).toBe(0);
    });

    it('does not advance when paused', () => {
      coordinator.start(createMockScene());
      coordinator.setPaused(true);
      coordinator.update(1.0);

      expect(coordinator.getState().timeElapsed).toBe(0);
    });

    it('does not advance when game over', () => {
      coordinator.start(createMockScene());
      coordinator.applyDamage(999);
      const timeAtGameOver = coordinator.getState().timeElapsed;

      coordinator.update(1.0);
      expect(coordinator.getState().timeElapsed).toBe(timeAtGameOver);
    });

    it('emits game:tick events', () => {
      const listener = vi.fn();
      eventBus.on('game:tick', listener);

      coordinator.start(createMockScene());
      coordinator.update(0.016, createMockScene());

      expect(listener).toHaveBeenCalledWith({
        dt: 0.016,
        state: expect.any(Object),
      });
    });
  });

  // ─── Start / Reset ───

  describe('start and reset', () => {
    it('start resets game-over and victory state', () => {
      coordinator.start();
      coordinator.applyDamage(999);
      expect(coordinator.getState().isGameOver).toBe(true);

      coordinator.start(createMockScene());
      expect(coordinator.getState().isGameOver).toBe(false);
      expect(coordinator.getState().isVictory).toBe(false);
      expect(coordinator.getState().collectedItems).toEqual([]);
    });

    it('reset returns to default state', () => {
      coordinator.addScore(100);
      coordinator.collectItem('item-1', 'coin', 10);
      coordinator.setHealth(50);

      coordinator.reset();

      const state = coordinator.getState();
      expect(state.score).toBe(0);
      expect(state.health).toBe(100);
      expect(state.collectedItems).toEqual([]);
      expect(state.isGameOver).toBe(false);
    });

    it('emits game:start on start', () => {
      const listener = vi.fn();
      eventBus.on('game:start', listener);

      coordinator.start(createMockScene());

      expect(listener).toHaveBeenCalledWith({ state: expect.any(Object) });
    });
  });

  // ─── Edge Cases ───

  describe('edge cases', () => {
    it('getState returns a copy (not a reference)', () => {
      const state1 = coordinator.getState();
      state1.score = 999;

      const state2 = coordinator.getState();
      expect(state2.score).toBe(0);
    });

    it('works without event bus', () => {
      const coord = new GameLoopCoordinator();
      // Should not throw
      coord.start(createMockScene());
      coord.addScore(10);
      coord.applyDamage(20);
      coord.update(0.016, createMockScene());

      expect(coord.getState().score).toBe(10);
      expect(coord.getState().health).toBe(80);
    });

    it('allows genre plugins to override state via onUpdate', () => {
      const plugin: GenrePlugin = {
        genre: 'override',
        onUpdate: (_dt, state) => {
          return { ...state, score: state.score + 1 };
        },
      };

      coordinator.registerGenrePlugin(plugin);
      coordinator.start(createMockScene());
      coordinator.update(0.016, createMockScene());

      expect(coordinator.getState().score).toBe(1);
    });
  });
});
