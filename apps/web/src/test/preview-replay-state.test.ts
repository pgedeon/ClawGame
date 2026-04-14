import { describe, expect, it } from 'vitest';
import {
  clonePreviewReplayEntity,
  restorePreviewReplayState,
  type PreviewReplayEntitySnapshot,
} from '../utils/previewReplayState';

describe('previewReplayState', () => {
  it('clones entity snapshots without sharing nested state', () => {
    const original: PreviewReplayEntitySnapshot = {
      id: 'enemy-1',
      type: 'enemy',
      width: 24,
      height: 24,
      transform: { x: 10, y: 20, rotation: 0.25 },
      components: { ai: { speed: 60 } },
      patrolOrigin: { x: 5, y: 6 },
    };

    const cloned = clonePreviewReplayEntity(original);
    cloned.transform.x = 99;
    cloned.components!.ai.speed = 120;
    cloned.patrolOrigin!.x = 42;

    expect(original.transform.x).toBe(10);
    expect(original.components!.ai.speed).toBe(60);
    expect(original.patrolOrigin!.x).toBe(5);
  });

  it('restores preview runtime collections and stats from a snapshot', () => {
    const entities = new Map<string, any>([
      ['stale', { id: 'stale', type: 'enemy', width: 1, height: 1, transform: { x: 0, y: 0 } }],
    ]);
    const projectiles = [{ id: 'old-proj', x: 0, y: 0, vx: 0, vy: 0, damage: 1 }];
    const towers = [{ id: 'old-tower', x: 0, y: 0, range: 50, damage: 1, fireRate: 1000, lastShot: 0, color: '#000', upgradeLevel: 0, baseCost: 30, towerType: "basic" as const }];
    const tdState = {
      waveIndex: 0,
      waveTimer: 0,
      spawnQueue: [],
      spawnTimer: 0,
      coreHealth: 10,
      maxCoreHealth: 10,
      waveMessage: '',
      waveMessageTimer: 0,
      enemiesAlive: 0,
      allWavesDone: false,
      enemyIdCounter: 0,
    };
    const collectedRuneIds = ['old-rune'];
    const defeatedEnemies = ['old-enemy'];

    const restored = restorePreviewReplayState(
      {
        t: 1400,
        entities: [{
          id: 'player',
          type: 'player',
          width: 32,
          height: 48,
          transform: { x: 40, y: 80 },
          health: 90,
        }],
        stats: { score: 55, health: 90, mana: 70 },
        runtime: {
          projectiles: [{ id: 'proj-1', x: 4, y: 5, vx: 10, vy: 0, damage: 25 }],
          towers: [{ id: 'tower-1', x: 8, y: 9, range: 150, damage: 20, fireRate: 800, lastShot: 200, color: '#abc', upgradeLevel: 0, baseCost: 30, towerType: "basic" as const }],
          tdState: {
            waveIndex: 2,
            waveTimer: 300,
            spawnQueue: [],
            spawnTimer: 25,
            coreHealth: 7,
            maxCoreHealth: 10,
            waveMessage: 'Wave 3',
            waveMessageTimer: 900,
            enemiesAlive: 4,
            allWavesDone: false,
            enemyIdCounter: 12,
          },
          collectedRuneIds: ['rune-a'],
          defeatedEnemies: ['enemy-a'],
          invincibleTimer: 125,
          lastShotTime: 1100,
          inventory: {
            items: [],
            equipment: { weapon: null, armor: null, accessory: null },
          },
          quests: [],
          learnedSpells: [],
          dialogueFlags: { metGuide: true },
        },
      },
      { entities, projectiles, towers, tdState, collectedRuneIds, defeatedEnemies },
    );

    expect(Array.from(entities.keys())).toEqual(['player']);
    expect(projectiles).toEqual([{ id: 'proj-1', x: 4, y: 5, vx: 10, vy: 0, damage: 25 }]);
    expect(towers).toEqual([{ id: 'tower-1', x: 8, y: 9, range: 150, damage: 20, fireRate: 800, lastShot: 200, color: '#abc', upgradeLevel: 0, baseCost: 30, towerType: "basic" as const }]);
    expect(tdState.waveIndex).toBe(2);
    expect(collectedRuneIds).toEqual(['rune-a']);
    expect(defeatedEnemies).toEqual(['enemy-a']);
    expect(restored).toMatchObject({
      score: 55,
      health: 90,
      mana: 70,
      gameTime: 1400,
      lastShotTime: 1100,
      invincibleTimer: 125,
      dialogueFlags: { metGuide: true },
    });
  });
});
