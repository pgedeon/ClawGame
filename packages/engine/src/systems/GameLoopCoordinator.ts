/**
 * @clawgame/engine - Game Loop Coordinator
 *
 * Orchestrates high-level game state tracking across engine systems.
 * Owns score, health, mana, collected items, time, victory, and defeat state.
 * Emits typed events so the preview/React layer can stay in sync without
 * the game loop directly calling state setters.
 *
 * This is one slice of the M14 runtime unification: moving gameplay state
 * ownership out of the React hook / canvas session and into the engine.
 */

import { type EventBus } from '../EventBus';
import { type Scene, type Entity, type CollectibleComponent, type StatsComponent } from '../types';

// ─── Game State ───

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
  return {
    score: 0,
    health: 100,
    mana: 100,
    maxHealth: 100,
    maxMana: 100,
    collectedItems: [],
    timeElapsed: 0,
    isGameOver: false,
    isVictory: false,
    isPaused: false,
  };
}

// ─── Events ───

export interface GameStateChangedEvent {
  key: keyof GameState;
  oldValue: any;
  newValue: any;
}

export interface CollectiblePickupEvent {
  itemId: string;
  itemType: string;
  value: number;
  totalCollected: number;
}

export interface ScoreChangedEvent {
  oldScore: number;
  newScore: number;
  delta: number;
}

export interface HealthChangedEvent {
  oldHealth: number;
  newHealth: number;
  delta: number;
}

export interface ManaChangedEvent {
  oldMana: number;
  newMana: number;
  delta: number;
}

export interface GameOverEvent {
  finalScore: number;
  timeElapsed: number;
}

export interface VictoryEvent {
  finalScore: number;
  timeElapsed: number;
  collectedItems: string[];
}

// ─── Genre Plugin ───

export interface GenrePlugin {
  /** Unique genre identifier */
  genre: string;

  /** Called once when a new game session starts */
  onStart?(state: GameState, scene: Scene): void;

  /** Called every frame with delta time in seconds */
  onUpdate?(dt: number, state: GameState, scene: Scene): GameState | null;

  /** Called when a collectible is picked up */
  onCollectiblePickup?(itemId: string, itemType: string, value: number, state: GameState): void;

  /** Called when health changes */
  onHealthChanged?(newHealth: number, oldHealth: number, state: GameState): void;

  /** Check for custom victory conditions */
  checkVictory?(state: GameState, scene: Scene): boolean;

  /** Check for custom defeat conditions */
  checkDefeat?(state: GameState, scene: Scene): boolean;

  /** Reset genre-specific state */
  reset?(): void;
}

// ─── Victory Condition Types ───

export interface VictoryCondition {
  type: 'collect-all' | 'score-threshold' | 'survive-time' | 'custom';
  /** For collect-all: tag to match collectibles */
  tag?: string;
  /** For score-threshold: target score */
  targetScore?: number;
  /** For survive-time: time in seconds */
  targetTime?: number;
}

// ─── Config ───

export interface GameLoopCoordinatorConfig {
  initialState?: Partial<GameState>;
  victoryConditions?: VictoryCondition[];
  /** Invincibility frames after taking damage (seconds) */
  invincibilityTime?: number;
}

// ─── Coordinator ───

export class GameLoopCoordinator {
  private state: GameState;
  private eventBus: EventBus | null = null;
  private genrePlugins: Map<string, GenrePlugin> = new Map();
  private victoryConditions: VictoryCondition[];
  private invincibilityTime: number;
  private invincibilityTimer: number = 0;
  private started: boolean = false;

  constructor(config: GameLoopCoordinatorConfig = {}) {
    this.state = {
      ...createDefaultGameState(),
      ...config.initialState,
    };
    this.victoryConditions = config.victoryConditions ?? [];
    this.invincibilityTime = config.invincibilityTime ?? 0.5;
  }

  /** Attach to an engine event bus for inter-system communication */
  attach(bus: EventBus): void {
    this.eventBus = bus;

    // Listen for engine collision events to auto-handle pickups and damage
    bus.on('collision:pickup', (payload: any) => {
      this.collectItem(payload.collectibleId, payload.type, payload.value ?? 1);
    });

    bus.on('collision:damage', (payload: any) => {
      this.applyDamage(payload.damage ?? 10);
    });
  }

  /** Register a genre plugin */
  registerGenrePlugin(plugin: GenrePlugin): void {
    this.genrePlugins.set(plugin.genre, plugin);
  }

  /** Get the current game state (read-only copy) */
  getState(): Readonly<GameState> {
    return { ...this.state };
  }

  /** Start a new game session */
  start(scene?: Scene): void {
    this.state = {
      ...createDefaultGameState(),
      ...this.state,
      isGameOver: false,
      isVictory: false,
      isPaused: false,
      timeElapsed: 0,
      collectedItems: [],
    };
    this.invincibilityTimer = 0;
    this.started = true;

    // Notify genre plugins
    if (scene) {
      for (const plugin of this.genrePlugins.values()) {
        plugin.onStart?.(this.state, scene);
      }
    }

    this.eventBus?.emit('game:start', { state: this.getState() });
  }

  /** Reset to default state */
  reset(): void {
    this.state = createDefaultGameState();
    this.invincibilityTimer = 0;
    this.started = false;

    for (const plugin of this.genrePlugins.values()) {
      plugin.reset?.();
    }
  }

  /** Per-frame update. Call with delta time in seconds. */
  update(dt: number, scene?: Scene): void {
    if (!this.started || this.state.isGameOver || this.state.isVictory || this.state.isPaused) {
      return;
    }

    // Advance time
    this.state.timeElapsed += dt;

    // Tick invincibility
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer = Math.max(0, this.invincibilityTimer - dt);
    }

    // Let genre plugins modify state
    if (scene) {
      for (const plugin of this.genrePlugins.values()) {
        const override = plugin.onUpdate?.(dt, this.state, scene);
        if (override) {
          this.mergeState(override);
        }
      }

      // Check victory conditions
      if (!this.state.isVictory && this.checkVictory(scene)) {
        this.triggerVictory();
      }

      // Check defeat conditions
      if (!this.state.isGameOver && this.checkDefeat(scene)) {
        this.triggerGameOver();
      }
    }

    this.eventBus?.emit('game:tick', { dt, state: this.getState() });
  }

  // ─── State Mutators ───

  addScore(delta: number): void {
    if (this.state.isGameOver || this.state.isVictory) return;
    const oldScore = this.state.score;
    this.state.score += delta;
    this.emit('game:score-changed', {
      oldScore,
      newScore: this.state.score,
      delta,
    } satisfies ScoreChangedEvent);
  }

  setScore(score: number): void {
    const oldScore = this.state.score;
    this.state.score = score;
    this.emit('game:score-changed', {
      oldScore,
      newScore: score,
      delta: score - oldScore,
    } satisfies ScoreChangedEvent);
  }

  applyDamage(amount: number): void {
    if (this.state.isGameOver || this.state.isVictory) return;
    if (this.invincibilityTimer > 0) return;

    const oldHealth = this.state.health;
    this.state.health = Math.max(0, this.state.health - amount);
    this.invincibilityTimer = this.invincibilityTime;

    this.emit('game:health-changed', {
      oldHealth,
      newHealth: this.state.health,
      delta: -amount,
    } satisfies HealthChangedEvent);

    // Notify genre plugins
    for (const plugin of this.genrePlugins.values()) {
      plugin.onHealthChanged?.(this.state.health, oldHealth, this.state);
    }

    if (this.state.health <= 0) {
      this.triggerGameOver();
    }
  }

  heal(amount: number): void {
    if (this.state.isGameOver) return;
    const oldHealth = this.state.health;
    this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);

    this.emit('game:health-changed', {
      oldHealth,
      newHealth: this.state.health,
      delta: amount,
    } satisfies HealthChangedEvent);
  }

  setHealth(health: number): void {
    const oldHealth = this.state.health;
    this.state.health = Math.max(0, Math.min(this.state.maxHealth, health));

    this.emit('game:health-changed', {
      oldHealth,
      newHealth: this.state.health,
      delta: this.state.health - oldHealth,
    } satisfies HealthChangedEvent);
  }

  useMana(amount: number): boolean {
    if (this.state.mana < amount) return false;
    const oldMana = this.state.mana;
    this.state.mana -= amount;

    this.emit('game:mana-changed', {
      oldMana,
      newMana: this.state.mana,
      delta: -amount,
    } satisfies ManaChangedEvent);

    return true;
  }

  regenerateMana(amount: number): void {
    const oldMana = this.state.mana;
    this.state.mana = Math.min(this.state.maxMana, this.state.mana + amount);

    this.emit('game:mana-changed', {
      oldMana,
      newMana: this.state.mana,
      delta: amount,
    } satisfies ManaChangedEvent);
  }

  setMana(mana: number): void {
    const oldMana = this.state.mana;
    this.state.mana = Math.max(0, Math.min(this.state.maxMana, mana));

    this.emit('game:mana-changed', {
      oldMana,
      newMana: this.state.mana,
      delta: this.state.mana - oldMana,
    } satisfies ManaChangedEvent);
  }

  setPaused(paused: boolean): void {
    this.state.isPaused = paused;
  }

  collectItem(itemId: string, itemType: string, value: number): void {
    if (this.state.collectedItems.includes(itemId)) return;

    this.state.collectedItems.push(itemId);
    this.addScore(value);

    this.emit('game:collectible-pickup', {
      itemId,
      itemType,
      value,
      totalCollected: this.state.collectedItems.length,
    } satisfies CollectiblePickupEvent);

    // Notify genre plugins
    for (const plugin of this.genrePlugins.values()) {
      plugin.onCollectiblePickup?.(itemId, itemType, value, this.state);
    }
  }

  // ─── Victory / Defeat ───

  private checkVictory(scene: Scene): boolean {
    for (const condition of this.victoryConditions) {
      switch (condition.type) {
        case 'collect-all': {
          const tag = condition.tag ?? 'rune';
          let totalWithTag = 0;
          scene.entities.forEach((entity) => {
            const tags = (entity as any).tags ?? [];
            const coll = entity.components.get('collectible') as CollectibleComponent | undefined;
            if (coll && (tags.includes(tag) || coll.type === tag)) {
              totalWithTag++;
            }
          });
          const collectedWithTag = this.state.collectedItems.length; // simplified
          if (totalWithTag > 0 && collectedWithTag >= totalWithTag) return true;
          break;
        }
        case 'score-threshold':
          if (this.state.score >= (condition.targetScore ?? Infinity)) return true;
          break;
        case 'survive-time':
          if (this.state.timeElapsed >= (condition.targetTime ?? Infinity)) return true;
          break;
        case 'custom':
          // Defer to genre plugins
          for (const plugin of this.genrePlugins.values()) {
            if (plugin.checkVictory?.(this.state, scene)) return true;
          }
          break;
      }
    }
    return false;
  }

  private checkDefeat(scene: Scene): boolean {
    if (this.state.health <= 0) return true;

    // Defer to genre plugins
    for (const plugin of this.genrePlugins.values()) {
      if (plugin.checkDefeat?.(this.state, scene)) return true;
    }

    return false;
  }

  private triggerVictory(): void {
    this.state.isVictory = true;
    this.emit('game:victory', {
      finalScore: this.state.score,
      timeElapsed: this.state.timeElapsed,
      collectedItems: [...this.state.collectedItems],
    } satisfies VictoryEvent);
  }

  private triggerGameOver(): void {
    this.state.isGameOver = true;
    this.emit('game:over', {
      finalScore: this.state.score,
      timeElapsed: this.state.timeElapsed,
    } satisfies GameOverEvent);
  }

  // ─── Internals ───

  private emit(event: string, payload: any): void {
    this.eventBus?.emit(event as any, payload);
  }

  private mergeState(partial: Partial<GameState>): void {
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        (this.state as any)[key] = value;
      }
    }
  }
}
