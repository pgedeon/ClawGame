/**
 * @clawgame/engine - EventBus
 *
 * Typed publish/subscribe event system for gameplay communication.
 * Used by engine systems, custom scripts, AI triggers, and UI bindings.
 *
 * Features:
 * - Type-safe event names and payloads
 * - Once-only subscriptions
 * - Unsubscribe via returned handle
 * - Wildcard listener (all events)
 * - Event history for debugging
 */

/** Map of engine event names to their payload types */
export interface EngineEvents {
  // Lifecycle
  'scene:load': { sceneName: string };
  'scene:unload': { sceneName: string };
  'engine:start': Record<string, never>;
  'engine:stop': Record<string, never>;
  'engine:error': { error: Error };

  // Entity lifecycle
  'entity:create': { entityId: string; type: string };
  'entity:destroy': { entityId: string };
  'entity:collision': { entityA: string; entityB: string; type: string };

  // Input
  'input:key-down': { key: string };
  'input:key-up': { key: string };

  // Gameplay
  'game:score': { points: number };
  'game:health-change': { entityId: string; delta: number; current: number };
  'game:death': { entityId: string };
  'game:collect': { entityId: string; collectibleType: string; value: number };

  // Collision system events
  'collision:enter': { entityA: string; entityB: string; typeA?: string; typeB?: string; overlap: { x: number; y: number } };
  'collision:pickup': { playerId: string; collectibleId: string; type: string; value: number };
  'collision:damage': { playerId: string; enemyId: string; damage: number };
  'collision:trigger': { triggerId: string; entityId: string; event: string; target?: string };
  'game:trigger': { triggerId: string; event: string; target?: string };
  'game:level-complete': Record<string, never>;
  'game:game-over': Record<string, never>;

  // AI
  'ai:state-change': { entityId: string; from: string; to: string };

  // Custom (user-defined gameplay events)
  [key: `custom:${string}`]: Record<string, unknown>;
}

type EventName = keyof EngineEvents;

export interface Subscription {
  unsubscribe(): void;
}

export class EventBus {
  private listeners = new Map<string, Set<Function>>();
  private wildcardListeners = new Set<(event: string, payload: unknown) => void>();
  private history: Array<{ event: string; payload: unknown; timestamp: number }> = [];
  private maxHistory: number;
  private muted = false;

  constructor(options?: { maxHistory?: number }) {
    this.maxHistory = options?.maxHistory ?? 100;
  }

  /**
   * Subscribe to an event. Returns a subscription handle.
   */
  on<E extends EventName>(event: E, listener: (payload: EngineEvents[E]) => void): Subscription {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(listener as Function);

    return {
      unsubscribe: () => {
        this.listeners.get(event as string)?.delete(listener as Function);
      },
    };
  }

  /**
   * Subscribe to an event, auto-unsubscribe after first emission.
   */
  once<E extends EventName>(event: E, listener: (payload: EngineEvents[E]) => void): Subscription {
    let sub: Subscription;
    const wrapped = ((payload: unknown) => {
      sub.unsubscribe();
      (listener as Function)(payload);
    }) as Function;

    sub = this.on(event, wrapped as (payload: EngineEvents[E]) => void);
    return sub;
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<E extends EventName>(event: E, payload?: EngineEvents[E]): void {
    if (this.muted) return;

    const record = { event: event as string, payload, timestamp: Date.now() };

    // Record history
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push(record);

    // Notify specific listeners
    const set = this.listeners.get(event as string);
    if (set) {
      for (const fn of set) {
        try {
          fn(payload);
        } catch (err) {
          console.error(`EventBus: error in listener for "${event as string}":`, err);
        }
      }
    }

    // Notify wildcard listeners
    for (const fn of this.wildcardListeners) {
      try {
        fn(event as string, payload);
      } catch (err) {
        console.error('EventBus: error in wildcard listener:', err);
      }
    }
  }

  /**
   * Subscribe to all events (wildcard).
   */
  onAny(listener: (event: string, payload: unknown) => void): Subscription {
    this.wildcardListeners.add(listener);
    return {
      unsubscribe: () => {
        this.wildcardListeners.delete(listener);
      },
    };
  }

  /**
   * Remove all listeners for a specific event, or all events.
   */
  clear(event?: EventName): void {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
    }
  }

  /**
   * Get event history (most recent first).
   */
  getHistory(limit?: number): Array<{ event: string; payload: unknown; timestamp: number }> {
    const h = [...this.history].reverse();
    return limit ? h.slice(0, limit) : h;
  }

  /**
   * Mute/unmute event bus. When muted, emit() is a no-op.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Number of listeners for a given event.
   */
  listenerCount(event: EventName): number {
    return (this.listeners.get(event as string)?.size ?? 0);
  }

  /**
   * Total number of listeners across all events.
   */
  totalListenerCount(): number {
    let count = this.wildcardListeners.size;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}
