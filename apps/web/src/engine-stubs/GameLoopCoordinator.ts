/**
 * Local stub — GameLoopCoordinator was removed from @clawgame/engine during cleanup.
 * Orchestrates game state: score, health, mana, victory/defeat.
 */

import type { EventBus, Scene, Entity, CollectibleComponent, StatsComponent } from '@clawgame/engine';

export interface GameState {
  score: number;
  health: number;
  mana: number;
  maxHealth: number;
  maxMana: number;
  collectedItems: string[];
  timeElapsed: number;
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
}

export function createDefaultGameState(): GameState {
  return { score: 0, health: 100, mana: 100, maxHealth: 100, maxMana: 100, collectedItems: [], timeElapsed: 0, isGameOver: false, isVictory: false, isPaused: false };
}

export interface GameStateChangedEvent { key: keyof GameState; oldValue: any; newValue: any; }
export interface CollectiblePickupEvent { itemId: string; itemType: string; value: number; totalCollected: number; }
export interface ScoreChangedEvent { oldScore: number; newScore: number; delta: number; }
export interface HealthChangedEvent { oldHealth: number; newHealth: number; delta: number; }
export interface ManaChangedEvent { oldMana: number; newMana: number; delta: number; }
export interface GameOverEvent { finalScore: number; timeElapsed: number; }
export interface VictoryEvent { finalScore: number; timeElapsed: number; collectedItems: string[]; }

export interface GenrePlugin {
  genre: string;
  onStart?(state: GameState, scene: Scene): void;
  onUpdate?(dt: number, state: GameState, scene: Scene): GameState | null;
  onCollectiblePickup?(itemId: string, itemType: string, value: number, state: GameState): void;
  onHealthChanged?(newHealth: number, oldHealth: number, state: GameState): void;
  checkVictory?(state: GameState, scene: Scene): boolean;
  checkDefeat?(state: GameState, scene: Scene): boolean;
  reset?(): void;
}

export interface VictoryCondition {
  type: 'collect-all' | 'score-threshold' | 'survive-time' | 'custom';
  tag?: string;
  targetScore?: number;
  targetTime?: number;
}

export interface GameLoopCoordinatorConfig {
  initialState?: Partial<GameState>;
  victoryConditions?: VictoryCondition[];
  invincibilityTime?: number;
}

export class GameLoopCoordinator {
  private state: GameState;
  private eventBus: EventBus | null = null;
  private genrePlugins: Map<string, GenrePlugin> = new Map();
  private victoryConditions: VictoryCondition[];
  private invincibilityTime: number;
  private invincibilityTimer = 0;
  private started = false;

  constructor(config: GameLoopCoordinatorConfig = {}) {
    this.state = { ...createDefaultGameState(), ...config.initialState };
    this.victoryConditions = config.victoryConditions ?? [];
    this.invincibilityTime = config.invincibilityTime ?? 0.5;
  }

  attach(bus: EventBus): void {
    this.eventBus = bus;
    bus.on('collision:pickup', (payload: any) => { this.collectItem(payload.collectibleId, payload.type, payload.value ?? 1); });
    bus.on('collision:damage', (payload: any) => { this.applyDamage(payload.damage ?? 10); });
  }

  registerGenrePlugin(plugin: GenrePlugin): void { this.genrePlugins.set(plugin.genre, plugin); }
  getState(): Readonly<GameState> { return { ...this.state }; }

  start(scene?: Scene): void {
    this.state = { ...createDefaultGameState(), ...this.state, isGameOver: false, isVictory: false, isPaused: false, timeElapsed: 0, collectedItems: [] };
    this.invincibilityTimer = 0;
    this.started = true;
    if (scene) { for (const p of this.genrePlugins.values()) p.onStart?.(this.state, scene); }
    this.eventBus?.emit('game:start' as any, { state: this.getState() });
  }

  reset(): void {
    this.state = createDefaultGameState();
    this.invincibilityTimer = 0;
    this.started = false;
    for (const p of this.genrePlugins.values()) p.reset?.();
  }

  update(dt: number, scene?: Scene): void {
    if (!this.started || this.state.isGameOver || this.state.isVictory || this.state.isPaused) return;
    this.state.timeElapsed += dt;
    if (this.invincibilityTimer > 0) this.invincibilityTimer = Math.max(0, this.invincibilityTimer - dt);
    if (scene) {
      for (const p of this.genrePlugins.values()) { const o = p.onUpdate?.(dt, this.state, scene); if (o) this.mergeState(o); }
      if (!this.state.isVictory && this.checkVictory(scene)) this.triggerVictory();
      if (!this.state.isGameOver && this.checkDefeat(scene)) this.triggerGameOver();
    }
    this.eventBus?.emit('game:tick' as any, { dt, state: this.getState() });
  }

  addScore(delta: number): void {
    if (this.state.isGameOver || this.state.isVictory) return;
    const old = this.state.score; this.state.score += delta;
    this.emit('game:score-changed', { oldScore: old, newScore: this.state.score, delta });
  }

  setScore(score: number): void {
    const old = this.state.score; this.state.score = score;
    this.emit('game:score-changed', { oldScore: old, newScore: score, delta: score - old });
  }

  applyDamage(amount: number): void {
    if (this.state.isGameOver || this.state.isVictory || this.invincibilityTimer > 0) return;
    const old = this.state.health; this.state.health = Math.max(0, this.state.health - amount);
    this.invincibilityTimer = this.invincibilityTime;
    this.emit('game:health-changed', { oldHealth: old, newHealth: this.state.health, delta: -amount });
    for (const p of this.genrePlugins.values()) p.onHealthChanged?.(this.state.health, old, this.state);
    if (this.state.health <= 0) this.triggerGameOver();
  }

  heal(amount: number): void {
    if (this.state.isGameOver) return;
    const old = this.state.health; this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);
    this.emit('game:health-changed', { oldHealth: old, newHealth: this.state.health, delta: amount });
  }

  setHealth(health: number): void {
    const old = this.state.health; this.state.health = Math.max(0, Math.min(this.state.maxHealth, health));
    this.emit('game:health-changed', { oldHealth: old, newHealth: this.state.health, delta: this.state.health - old });
  }

  useMana(amount: number): boolean {
    if (this.state.mana < amount) return false;
    const old = this.state.mana; this.state.mana -= amount;
    this.emit('game:mana-changed', { oldMana: old, newMana: this.state.mana, delta: -amount });
    return true;
  }

  regenerateMana(amount: number): void {
    const old = this.state.mana; this.state.mana = Math.min(this.state.maxMana, this.state.mana + amount);
    this.emit('game:mana-changed', { oldMana: old, newMana: this.state.mana, delta: amount });
  }

  setMana(mana: number): void {
    const old = this.state.mana; this.state.mana = Math.max(0, Math.min(this.state.maxMana, mana));
    this.emit('game:mana-changed', { oldMana: old, newMana: this.state.mana, delta: this.state.mana - old });
  }

  setPaused(paused: boolean): void { this.state.isPaused = paused; }

  collectItem(itemId: string, itemType: string, value: number): void {
    if (this.state.collectedItems.includes(itemId)) return;
    this.state.collectedItems.push(itemId); this.addScore(value);
    this.emit('game:collectible-pickup', { itemId, itemType, value, totalCollected: this.state.collectedItems.length });
    for (const p of this.genrePlugins.values()) p.onCollectiblePickup?.(itemId, itemType, value, this.state);
  }

  private checkVictory(scene: Scene): boolean {
    for (const c of this.victoryConditions) {
      switch (c.type) {
        case 'collect-all': { const tag = c.tag ?? 'rune'; let total = 0; scene.entities.forEach(e => { const t = (e as any).tags ?? []; const col = e.components.get('collectible') as CollectibleComponent | undefined; if (col && (t.includes(tag) || col.type === tag)) total++; }); if (total > 0 && this.state.collectedItems.length >= total) return true; break; }
        case 'score-threshold': if (this.state.score >= (c.targetScore ?? Infinity)) return true; break;
        case 'survive-time': if (this.state.timeElapsed >= (c.targetTime ?? Infinity)) return true; break;
        case 'custom': for (const p of this.genrePlugins.values()) if (p.checkVictory?.(this.state, scene)) return true; break;
      }
    }
    return false;
  }

  private checkDefeat(scene: Scene): boolean {
    if (this.state.health <= 0) return true;
    for (const p of this.genrePlugins.values()) if (p.checkDefeat?.(this.state, scene)) return true;
    return false;
  }

  private triggerVictory(): void {
    this.state.isVictory = true;
    this.emit('game:victory', { finalScore: this.state.score, timeElapsed: this.state.timeElapsed, collectedItems: [...this.state.collectedItems] });
  }

  private triggerGameOver(): void {
    this.state.isGameOver = true;
    this.emit('game:over', { finalScore: this.state.score, timeElapsed: this.state.timeElapsed });
  }

  private emit(event: string, payload: any): void { this.eventBus?.emit(event as any, payload); }
  private mergeState(partial: Partial<GameState>): void { for (const [k, v] of Object.entries(partial)) if (v !== undefined) (this.state as any)[k] = v; }
}
