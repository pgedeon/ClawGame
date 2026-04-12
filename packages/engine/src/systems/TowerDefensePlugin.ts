/**
 * @clawgame/engine - Tower Defense Genre Plugin
 *
 * A GenrePlugin implementation for tower defense games.
 * Manages wave spawning, tower placement validation, enemy pathing toward core,
 * and wave-based victory conditions.
 *
 * M14 runtime unification: demonstrates the GenrePlugin interface.
 */

import {
  type GenrePlugin,
  type GameState,
  type VictoryCondition,
} from './GameLoopCoordinator';
import { type Scene, type Entity, type EntityType } from '../types';

// ─── Types ───

export interface WaveConfig {
  enemyCount: number;
  enemySpeed: number;
  enemyHealth: number;
  spawnInterval: number; // ms between spawns
  delay: number; // ms before wave starts
}

export interface TDConfig {
  waves: WaveConfig[];
  coreEntityId: string;
  towerCost: number;
  towerDamage: number;
  towerRange: number;
  towerFireRate: number; // shots per second
  manaRegenRate: number;
}

export interface TDState {
  waveIndex: number;
  waveActive: boolean;
  enemiesAlive: number;
  enemiesSpawned: number;
  totalEnemiesInWave: number;
  spawnTimer: number;
  waveDelayTimer: number;
  towerCount: number;
  coreHealth: number;
  maxCoreHealth: number;
  waveMessage: string;
  waveMessageTimer: number;
}

// ─── Default Config ───

export function createDefaultTDConfig(): TDConfig {
  return {
    coreEntityId: 'magic-bean',
    towerCost: 30,
    towerDamage: 10,
    towerRange: 150,
    towerFireRate: 1,
    manaRegenRate: 5, // per second
    waves: [
      { enemyCount: 5,  enemySpeed: 80,  enemyHealth: 20,  spawnInterval: 1200, delay: 3000 },
      { enemyCount: 8,  enemySpeed: 90,  enemyHealth: 30,  spawnInterval: 1000, delay: 5000 },
      { enemyCount: 12, enemySpeed: 100, enemyHealth: 40,  spawnInterval: 800,  delay: 5000 },
      { enemyCount: 15, enemySpeed: 110, enemyHealth: 50,  spawnInterval: 600,  delay: 5000 },
      { enemyCount: 20, enemySpeed: 120, enemyHealth: 60,  spawnInterval: 500,  delay: 5000 },
    ],
  };
}

export function createDefaultTDState(): TDState {
  return {
    waveIndex: 0,
    waveActive: false,
    enemiesAlive: 0,
    enemiesSpawned: 0,
    totalEnemiesInWave: 0,
    spawnTimer: 0,
    waveDelayTimer: 0,
    towerCount: 0,
    coreHealth: 100,
    maxCoreHealth: 100,
    waveMessage: 'Wave 1 incoming!',
    waveMessageTimer: 3000,
  };
}

// ─── Plugin ───

export class TowerDefensePlugin implements GenrePlugin {
  readonly genre = 'tower-defense';

  private config: TDConfig;
  private tdState: TDState;
  private onSpawnEnemy: ((x: number, y: number, health: number, speed: number) => void) | null = null;
  private onRemoveEnemy: ((id: string) => void) | null = null;

  constructor(config?: Partial<TDConfig>, tdState?: Partial<TDState>) {
    this.config = { ...createDefaultTDConfig(), ...config };
    this.tdState = { ...createDefaultTDState(), ...tdState };
  }

  /** Register callbacks for entity management (called by the session) */
  setSpawnCallback(cb: (x: number, y: number, health: number, speed: number) => void): void {
    this.onSpawnEnemy = cb;
  }

  setRemoveEnemyCallback(cb: (id: string) => void): void {
    this.onRemoveEnemy = cb;
  }

  getState(): TDState {
    return { ...this.tdState };
  }

  getConfig(): TDConfig {
    return { ...this.config };
  }

  onStart(state: GameState, scene: Scene): void {
    this.tdState.waveIndex = 0;
    this.tdState.waveActive = false;
    this.tdState.enemiesAlive = 0;
    this.tdState.enemiesSpawned = 0;
    this.tdState.spawnTimer = 0;
    this.tdState.towerCount = 0;

    const firstWave = this.config.waves[0];
    if (firstWave) {
      this.tdState.waveDelayTimer = firstWave.delay;
      this.tdState.totalEnemiesInWave = firstWave.enemyCount;
      this.tdState.waveMessage = 'Wave 1 incoming!';
      this.tdState.waveMessageTimer = 3000;
    }
  }

  onUpdate(dtMs: number, state: GameState, scene: Scene): GameState | null {
    const dt = dtMs / 1000;

    // Mana regen
    const newMana = Math.min(state.maxMana, state.mana + this.config.manaRegenRate * dt);
    state = { ...state, mana: newMana };

    // Wave message fade
    if (this.tdState.waveMessageTimer > 0) {
      this.tdState.waveMessageTimer -= dtMs;
    }

    // Count living enemies
    this.tdState.enemiesAlive = [...scene.entities.values()].filter(
        (e) => e.type === 'enemy' && (e.components.get('stats') as any)?.hp > 0
      ).length;

    // Count towers
    this.tdState.towerCount = [...scene.entities.values()].filter(
        (e) => e.components.has("tower")
      ).length;

    // Wave delay countdown
    if (!this.tdState.waveActive && this.tdState.waveIndex < this.config.waves.length) {
      this.tdState.waveDelayTimer -= dtMs;
      if (this.tdState.waveDelayTimer <= 0) {
        this.startWave(this.tdState.waveIndex);
      }
      return state;
    }

    // Spawn enemies during active wave
    if (this.tdState.waveActive && this.tdState.enemiesSpawned < this.tdState.totalEnemiesInWave) {
      this.tdState.spawnTimer -= dtMs;
      if (this.tdState.spawnTimer <= 0) {
        const wave = this.config.waves[this.tdState.waveIndex];
        this.spawnEnemy(wave);
        this.tdState.spawnTimer = wave.spawnInterval;
      }
    }

    // Check wave completion
    if (this.tdState.waveActive &&
        this.tdState.enemiesSpawned >= this.tdState.totalEnemiesInWave &&
        this.tdState.enemiesAlive <= 0) {
      this.completeWave();
    }

    return state;
  }

  onCollectiblePickup(itemId: string, itemType: string, value: number, state: GameState): void {
    // Runes give bonus score, mana orbs give mana
    if (itemType === 'mana') {
      // Mana pickup bonus handled via coordinator already
    }
  }

  canPlaceTower(mana: number): boolean {
    return mana >= this.config.towerCost;
  }

  placeTower(mana: number): number {
    return mana - this.config.towerCost;
  }

  checkVictory(state: GameState, scene: Scene): boolean {
    return this.tdState.waveIndex >= this.config.waves.length && this.tdState.enemiesAlive <= 0;
  }

  getVictoryConditions(): VictoryCondition[] {
    return [{ type: 'custom' }];
  }

  // ─── Internal ───

  private startWave(index: number): void {
    const wave = this.config.waves[index];
    if (!wave) return;

    this.tdState.waveActive = true;
    this.tdState.enemiesSpawned = 0;
    this.tdState.totalEnemiesInWave = wave.enemyCount;
    this.tdState.spawnTimer = 0;
    this.tdState.waveMessage = `Wave ${index + 1}!`;
    this.tdState.waveMessageTimer = 2000;
  }

  private spawnEnemy(wave: WaveConfig): void {
    this.tdState.enemiesSpawned++;

    if (this.onSpawnEnemy) {
      // Random spawn position along edges
      const side = Math.floor(Math.random() * 3);
      let x: number, y: number;
      if (side === 0) { x = 50 + Math.random() * 700; y = 20; }
      else if (side === 1) { x = 770; y = 50 + Math.random() * 500; }
      else { x = 30; y = 50 + Math.random() * 500; }

      this.onSpawnEnemy(x, y, wave.enemyHealth, wave.enemySpeed);
    }
  }

  private completeWave(): void {
    this.tdState.waveActive = false;
    this.tdState.waveIndex++;

    if (this.tdState.waveIndex < this.config.waves.length) {
      const next = this.config.waves[this.tdState.waveIndex];
      this.tdState.waveDelayTimer = next.delay;
      this.tdState.waveMessage = `Wave ${this.tdState.waveIndex + 1} incoming!`;
      this.tdState.waveMessageTimer = 3000;
    } else {
      this.tdState.waveMessage = 'All waves cleared!';
      this.tdState.waveMessageTimer = 5000;
    }
  }
}
