import { describe, expect, it } from 'vitest';
import {
  createTowerDefenseState,
  createTowerDefenseTower,
  createTowerDefenseTowerAt,
  registerTowerDefenseEnemyDefeat,
  updateTowerDefenseFrame,
  validateTowerPlacement,
  type TowerDefenseTower,
} from '../utils/previewTowerDefense';

describe('previewTowerDefense', () => {
  it('spawns queued enemies after the wave delay elapses', () => {
    const entities = new Map<string, any>([
      ['core-bean', {
        id: 'core-bean',
        type: 'core',
        width: 32,
        height: 32,
        transform: { x: 200, y: 340 },
      }],
    ]);
    const state = createTowerDefenseState(500);
    // Simulate player clicking "Start Wave"
    state.waitingForPlayer = false;
    const result = updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 1000,
      deltaTime: 1000,
      entities,
      towers: [],
      projectiles: [],
      state,
      waves: [
        {
          delay: 1000,
          message: 'Wave 1',
          enemies: [{ count: 1, type: 'intern', hp: 20, speed: 80, score: 10 }],
        },
      ],
      random: () => 0.5,
    });

    expect(result.victory).toBe(false);
    expect(state.waveIndex).toBe(1);
    expect(state.enemiesAlive).toBe(1);
    expect(state.waveMessage).toBe('Wave 1');
    expect(entities.has('td-enemy-1')).toBe(true);
  });

  it('fires tower projectiles at the nearest enemy in range', () => {
    const entities = new Map<string, any>([
      ['enemy-near', {
        id: 'enemy-near',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 160, y: 100 },
      }],
      ['enemy-far', {
        id: 'enemy-far',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 260, y: 100 },
      }],
    ]);
    const towers: TowerDefenseTower[] = [createTowerDefenseTower({ transform: { x: 100, y: 100 } }, 'basic')];
    const projectiles: any[] = [];
    const state = createTowerDefenseState(500);

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 1000,
      deltaTime: 16,
      entities,
      towers,
      projectiles,
      state,
      waves: [],
    });

    expect(projectiles).toHaveLength(1);
    expect(projectiles[0].x).toBe(100);
    expect(projectiles[0].y).toBe(100);
    expect(projectiles[0].vx).toBeGreaterThan(0);
    expect(towers[0].lastShot).toBe(1000);
  });

  it('moves TD projectiles, damages enemies on hit, and removes the projectile', () => {
    const entities = new Map<string, any>([
      ['enemy-1', {
        id: 'enemy-1',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 130, y: 100 },
        health: 20,
        tdSpeed: 0,
        currentWaypointIndex: 99,
      }],
    ]);
    const towers: TowerDefenseTower[] = [createTowerDefenseTower({ transform: { x: 100, y: 100 } }, 'basic')];
    const projectiles: any[] = [];
    const state = createTowerDefenseState(500);
    state.enemiesAlive = 1;

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 1000,
      deltaTime: 16,
      entities,
      towers,
      projectiles,
      state,
      waves: [],
      random: () => 0.5,
    });

    expect(projectiles).toHaveLength(1);

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 1100,
      deltaTime: 100,
      entities,
      towers,
      projectiles,
      state,
      waves: [],
      random: () => 0.5,
    });

    expect(projectiles).toHaveLength(0);
    expect(entities.get('enemy-1')?.health).toBe(5);
    expect(entities.get('enemy-1')?.hitFlash).toBe(200);
  });

  it('moves enemies along waypoint segments instead of directly at the core', () => {
    const entities = new Map<string, any>([
      ['magic-bean', {
        id: 'magic-bean',
        type: 'npc',
        width: 32,
        height: 32,
        transform: { x: 400, y: 55 },
      }],
      ['enemy-path', {
        id: 'enemy-path',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 100, y: 588 },
        damage: 12,
        tdSpeed: 80,
        currentWaypointIndex: 1,
      }],
    ]);
    const state = createTowerDefenseState(100, 'coffee-run', 800, 600);
    state.enemiesAlive = 1;

    updateTowerDefenseFrame({
      canvasWidth: 800,
      canvasHeight: 600,
      currentTime: 1000,
      deltaTime: 1000,
      entities,
      towers: [],
      projectiles: [],
      state,
      waves: [],
    });

    expect(entities.get('enemy-path')?.transform.x).toBe(100);
    expect(entities.get('enemy-path')?.transform.y).toBe(508);
    expect(entities.get('enemy-path')?.currentWaypointIndex).toBe(1);
  });

  it('advances to the next waypoint once an enemy is within the arrival radius', () => {
    const entities = new Map<string, any>([
      ['magic-bean', {
        id: 'magic-bean',
        type: 'npc',
        width: 32,
        height: 32,
        transform: { x: 400, y: 55 },
      }],
      ['enemy-turn', {
        id: 'enemy-turn',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 100, y: 466 },
        damage: 12,
        tdSpeed: 80,
        currentWaypointIndex: 1,
      }],
    ]);
    const state = createTowerDefenseState(100, 'coffee-run', 800, 600);
    state.enemiesAlive = 1;

    updateTowerDefenseFrame({
      canvasWidth: 800,
      canvasHeight: 600,
      currentTime: 1000,
      deltaTime: 100,
      entities,
      towers: [],
      projectiles: [],
      state,
      waves: [],
    });

    expect(entities.get('enemy-turn')?.currentWaypointIndex).toBe(2);
    expect(entities.get('enemy-turn')?.transform.y).toBe(460);
    expect(entities.get('enemy-turn')?.transform.x).toBeGreaterThan(100);
  });

  it('applies cannon splash and frost slow on hit instead of on fire', () => {
    const cannonEntities = new Map<string, any>([
      ['enemy-primary', {
        id: 'enemy-primary',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 130, y: 100 },
        health: 60,
        tdSpeed: 0,
        currentWaypointIndex: 99,
      }],
      ['enemy-splash', {
        id: 'enemy-splash',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 170, y: 100 },
        health: 60,
        tdSpeed: 0,
        currentWaypointIndex: 99,
      }],
    ]);
    const cannonTower: TowerDefenseTower[] = [createTowerDefenseTower({ transform: { x: 100, y: 100 } }, 'cannon')];
    const cannonProjectiles: any[] = [];
    const cannonState = createTowerDefenseState(500);
    cannonState.enemiesAlive = 2;

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 2000,
      deltaTime: 16,
      entities: cannonEntities,
      towers: cannonTower,
      projectiles: cannonProjectiles,
      state: cannonState,
      waves: [],
      random: () => 0.25,
    });

    expect(cannonEntities.get('enemy-splash')?.health).toBe(60);

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 2120,
      deltaTime: 120,
      entities: cannonEntities,
      towers: cannonTower,
      projectiles: cannonProjectiles,
      state: cannonState,
      waves: [],
      random: () => 0.25,
    });

    expect(cannonProjectiles).toHaveLength(0);
    expect(cannonEntities.get('enemy-primary')?.health).toBe(25);
    expect(cannonEntities.get('enemy-splash')?.health).toBe(39);

    const frostEntities = new Map<string, any>([
      ['enemy-frost', {
        id: 'enemy-frost',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 130, y: 100 },
        health: 40,
        tdSpeed: 80,
        currentWaypointIndex: 99,
      }],
    ]);
    const frostTower: TowerDefenseTower[] = [createTowerDefenseTower({ transform: { x: 100, y: 100 } }, 'frost')];
    const frostProjectiles: any[] = [];
    const frostState = createTowerDefenseState(500);
    frostState.enemiesAlive = 1;

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 3000,
      deltaTime: 16,
      entities: frostEntities,
      towers: frostTower,
      projectiles: frostProjectiles,
      state: frostState,
      waves: [],
      random: () => 0.75,
    });

    expect(frostEntities.get('enemy-frost')?.slowedUntil).toBeUndefined();

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 3080,
      deltaTime: 80,
      entities: frostEntities,
      towers: frostTower,
      projectiles: frostProjectiles,
      state: frostState,
      waves: [],
      random: () => 0.75,
    });

    expect(frostEntities.get('enemy-frost')?.slowedUntil).toBe(5080);
  });

  it('starts lightning chains on hit instead of on fire', () => {
    const entities = new Map<string, any>([
      ['enemy-primary', {
        id: 'enemy-primary',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 130, y: 100 },
        health: 50,
        tdSpeed: 0,
        currentWaypointIndex: 99,
      }],
      ['enemy-chain', {
        id: 'enemy-chain',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 190, y: 100 },
        health: 50,
        tdSpeed: 0,
        currentWaypointIndex: 99,
      }],
    ]);
    const towers: TowerDefenseTower[] = [createTowerDefenseTower({ transform: { x: 100, y: 100 } }, 'lightning')];
    const projectiles: any[] = [];
    const state = createTowerDefenseState(500);
    state.enemiesAlive = 2;

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 4000,
      deltaTime: 16,
      entities,
      towers,
      projectiles,
      state,
      waves: [],
      random: () => 0.1,
    });

    expect(projectiles).toHaveLength(1);

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 4060,
      deltaTime: 60,
      entities,
      towers,
      projectiles,
      state,
      waves: [],
      random: () => 0.1,
    });

    expect(entities.get('enemy-primary')?.health).toBe(30);
    expect(projectiles).toHaveLength(1);

    updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 4160,
      deltaTime: 100,
      entities,
      towers,
      projectiles,
      state,
      waves: [],
      random: () => 0.1,
    });

    expect(entities.get('enemy-chain')?.health).toBe(36);
  });

  it('damages the core and decrements alive enemies when one reaches it', () => {
    const entities = new Map<string, any>([
      ['core-bean', {
        id: 'core-bean',
        type: 'core',
        width: 32,
        height: 32,
        transform: { x: 100, y: 100 },
      }],
      ['enemy-1', {
        id: 'enemy-1',
        type: 'enemy',
        width: 24,
        height: 24,
        transform: { x: 100, y: 100 },
        damage: 12,
        tdSpeed: 80,
        // Skip all waypoints so enemy goes directly to core
        currentWaypointIndex: 99,
      }],
    ]);
    const state = createTowerDefenseState(100);
    state.enemiesAlive = 1;

    const result = updateTowerDefenseFrame({
      canvasWidth: 400,
      canvasHeight: 400,
      currentTime: 1000,
      deltaTime: 16,
      entities,
      towers: [],
      projectiles: [],
      state,
      waves: [],
    });

    expect(result.gameOver).toBe(false);
    expect(state.coreHealth).toBe(88);
    expect(state.enemiesAlive).toBe(0);
    expect(entities.has('enemy-1')).toBe(false);
  });

  it('clamps defeated-enemy bookkeeping at zero', () => {
    const state = createTowerDefenseState(100);

    registerTowerDefenseEnemyDefeat(state);

    expect(state.enemiesAlive).toBe(0);
  });

  it('rejects placements that overlap the path or another tower', () => {
    const existingTower = createTowerDefenseTowerAt({ x: 220, y: 220 }, 'basic');

    expect(validateTowerPlacement({
      x: 100,
      y: 450,
      canvasWidth: 800,
      canvasHeight: 600,
      towers: [],
      mapLayout: 'coffee-run',
      corePosition: { x: 400, y: 55 },
    })).toEqual({ valid: false, reason: 'path' });

    expect(validateTowerPlacement({
      x: 230,
      y: 220,
      canvasWidth: 800,
      canvasHeight: 600,
      towers: [existingTower],
      mapLayout: 'coffee-run',
      corePosition: { x: 400, y: 55 },
    })).toEqual({ valid: false, reason: 'overlap' });
  });

  it('accepts open build spots away from the path', () => {
    expect(validateTowerPlacement({
      x: 520,
      y: 360,
      canvasWidth: 800,
      canvasHeight: 600,
      towers: [],
      mapLayout: 'coffee-run',
      corePosition: { x: 400, y: 55 },
    })).toEqual({ valid: true });

    const tower = createTowerDefenseTower({ transform: { x: 520, y: 360 } }, 'lightning');
    expect(tower.towerType).toBe('lightning');
    expect(tower.x).toBe(520);
    expect(tower.y).toBe(360);
  });
});
