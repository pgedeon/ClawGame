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
