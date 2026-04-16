/**
 * @clawgame/engine - EventBus
 *
 * Typed publish/subscribe event system for gameplay communication.
 */

export interface EngineEvents {
  'scene:load': { sceneName: string };
  'scene:unload': { sceneName: string };
  'engine:start': Record<string, never>;
  'engine:stop': Record<string, never>;
  'engine:error': { error: Error; message?: string; timestamp?: number };
  'game:pause': Record<string, never>;
  'game:resume': Record<string, never>;

  'entity:create': { entityId: string; type: string };
  'entity:destroy': { entityId: string };
  'entity:collision': { entityA: string; entityB: string; type: string };

  'animation:complete': {
    entityId: string;
    entityName?: string;
    animation: { frames: string[]; frameRate: number; loop: boolean };
  };
  'animation:statechange': {
    entityId: string;
    entityName: string;
    fromState: string;
    toState: string;
    animation: { frames: string[]; frameRate: number; loop: boolean };
  };

  'input:key-down': { key: string };
  'input:key-up': { key: string };

  'game:score': { points: number };
  'game:health-change': { entityId: string; delta: number; current: number };
  'game:death': { entityId: string };
  'game:collect': { entityId: string; collectibleType: string; value: number };

  'game:start': { state: any };
  'game:tick': { dt: number; state: any };
  'game:score-changed': { oldScore: number; newScore: number; delta: number };
  'game:health-changed': { oldHealth: number; newHealth: number; delta: number };
  'game:mana-changed': { oldMana: number; newMana: number; delta: number };
  'game:collectible-pickup': { itemId: string; itemType: string; value: number; totalCollected: number };
  'game:over': { finalScore: number; timeElapsed: number };
  'game:victory': { finalScore: number; timeElapsed: number; collectedItems: string[] };

  'collision:overlap': { entity: string; other: string; type: string; otherType: string; };
  'collision:enter': { entityA: string; entityB: string; typeA?: string; typeB?: string; overlap: { x: number; y: number } };
  'collision:pickup': { playerId: string; collectibleId: string; type: string; value: number };
  'collision:damage': { playerId: string; enemyId: string; damage: number };
  'collision:trigger': { triggerId: string; entityId: string; event?: string; target?: string };
  'projectile:hit': { projectileId: string; targetId: string; targetType?: string; damage: number; isSpell?: boolean };
  'projectile:destroy': { projectileId: string; reason: 'hit' | 'blocked' | 'bounds' | 'expired'; targetId?: string; targetType?: string };
  'entity:damage': { entityId: string; damage: number; remainingHealth: number };
  'entity:defeated': { entityId: string; type: string };

  'ai:target-acquired': { entityId: string; targetId: string; behavior: string };
  'ai:target-lost': { entityId: string; targetId: string; behavior: string };
  'ai:behavior-change': { entityId: string; oldBehavior: string; newBehavior: string };
  'ai:path-computed': { entityId: string; path: { x: number; y: number }[]; behavior: string };

  'navigation:waypoint-reached': { entityId: string; waypointIndex: number; pathIndex: number };
  'navigation:path-complete': { entityId: string };
  'navigation:reroute': { entityId: string; reason: string };

  'pathfinding:requested': { entityId: string; target: { x: number; y: number }; requestId: string };
  'pathfinding:computed': { requestId: string; path: { x: number; y: number }[]; success: boolean };
  'pathfinding:failed': { requestId: string; reason: string };

  'system:tick': { deltaTime: number };
  'system:debug': { message: string; data?: any };
}

export interface EventHandle {
  unsubscribe: () => void;
}

export type EventCallback<T extends keyof EngineEvents> = (payload: EngineEvents[T]) => void;
export type WildcardCallback = (eventName: keyof EngineEvents, payload: any) => void;

export class EventBus {
  private listeners = new Map<keyof EngineEvents, Set<EventCallback<keyof EngineEvents>>>();
  private wildcardListeners = new Set<WildcardCallback>();

  on<T extends keyof EngineEvents>(eventName: T, callback: EventCallback<T>): EventHandle {
    const listeners = this.listeners.get(eventName) ?? new Set<EventCallback<keyof EngineEvents>>();
    listeners.add(callback as EventCallback<keyof EngineEvents>);
    this.listeners.set(eventName, listeners);

    return {
      unsubscribe: () => this.off(eventName, callback),
    };
  }

  once<T extends keyof EngineEvents>(eventName: T, callback: EventCallback<T>): EventHandle {
    const wrapped: EventCallback<T> = (payload) => {
      this.off(eventName, wrapped);
      callback(payload);
    };

    return this.on(eventName, wrapped);
  }

  off<T extends keyof EngineEvents>(eventName: T, callback?: EventCallback<T>): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) {
      return;
    }

    if (!callback) {
      this.listeners.delete(eventName);
      return;
    }

    listeners.delete(callback as EventCallback<keyof EngineEvents>);
    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  onAny(callback: WildcardCallback): EventHandle {
    this.wildcardListeners.add(callback);
    return {
      unsubscribe: () => {
        this.wildcardListeners.delete(callback);
      },
    };
  }

  emit<T extends keyof EngineEvents>(eventName: T, payload: EngineEvents[T]): void {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      for (const listener of Array.from(listeners)) {
        listener(payload);
      }
    }

    for (const listener of Array.from(this.wildcardListeners)) {
      listener(eventName, payload);
    }
  }

  getListeners<T extends keyof EngineEvents>(eventName: T): EventCallback<T>[] {
    return Array.from(this.listeners.get(eventName) ?? []) as EventCallback<T>[];
  }

  clearListeners<T extends keyof EngineEvents>(eventName?: T): void {
    if (eventName) {
      this.listeners.delete(eventName);
      return;
    }

    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  destroy(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }
}
