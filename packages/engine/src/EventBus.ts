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
  'game:pause': Record<string, never>;
  'game:resume': Record<string, never>;

  // Entity management
  'entity:create': { entityId: string; type: string };
  'entity:destroy': { entityId: string };
  'entity:collision': { entityA: string; entityB: string; type: string };

  // Animation
  'animation:complete': { entityId: string; entityName?: string; animation: { frames: string[]; frameRate: number; loop: boolean } };
  'animation:statechange': { entityId: string; entityName: string; fromState: string; toState: string; animation: { frames: string[]; frameRate: number; loop: boolean } };

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
  'collision:trigger': { triggerId: string; entityId: string; event?: string; target?: string };
  'projectile:hit': { projectileId: string; targetId: string; targetType?: string; damage: number };
  'projectile:destroy': { projectileId: string; reason: 'hit' | 'blocked' | 'bounds' | 'expired'; targetId?: string; targetType?: string };

  // AI behavior events
  'ai:target-acquired': { entityId: string; targetId: string; behavior: string };
  'ai:target-lost': { entityId: string; targetId: string; behavior: string };
  'ai:behavior-change': { entityId: string; oldBehavior: string; newBehavior: string };
  'ai:path-computed': { entityId: string; path: { x: number; y: number }[]; behavior: string };

  // Navigation events
  'navigation:waypoint-reached': { entityId: string; waypointIndex: number; pathIndex: number };
  'navigation:path-complete': { entityId: string };
  'navigation:reroute': { entityId: string; reason: string };

  // Pathfinding events
  'pathfinding:requested': { entityId: string; target: { x: number; y: number }; requestId: string };
  'pathfinding:computed': { requestId: string; path: { x: number; y: number }[]; success: boolean };
  'pathfinding:failed': { requestId: string; reason: string };

  // System events
  'system:tick': { deltaTime: number };
  'system:debug': { message: string; data?: any };
}

/**
 * Event subscription handle for unsubscribing
 */
export interface EventHandle {
  unsubscribe: () => void;
}
/** @deprecated Use EventHandle instead */
export type Subscription = EventHandle;

/**
 * Event callback type
 */
export type EventCallback<T extends keyof EngineEvents> = (payload: EngineEvents[T]) => void;

/**
 * Wildcard callback for all events
 */
export type WildcardCallback = (eventName: keyof EngineEvents, payload: any) => void;

/**
 * EventBus — Central event hub for gameplay communication
 * 
 * Type-safe publish/subscribe system used by:
 * - Engine systems (Physics, Animation, Navigation, etc.)
 * - Custom game scripts
 * - AI triggers and behaviors
 * - UI bindings for real-time updates
 * - Debugging and profiling tools
 */
export class EventBus {
  private listeners: Map<keyof EngineEvents, EventCallback<keyof EngineEvents>[]> = new Map();
  private wildcardListeners: WildcardCallback[] = [];
  private eventHistory: { event: keyof EngineEvents; payload: any; timestamp: number }[] = [];
  private maxHistory: number = 1000;
  private historyEnabled: boolean = true;

  constructor(config?: { maxHistory?: number }) {
    if (config?.maxHistory) {
      this.maxHistory = config.maxHistory;
    }
  }

  /**
   * Subscribe to a specific event type
   * @param eventName Name of the event to listen for
   * @param callback Function to call when event fires
   * @returns Unsubscribe handle
   */
  on<T extends keyof EngineEvents>(eventName: T, callback: EventCallback<T>): EventHandle {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(callback as any);

    return {
      unsubscribe: () => {
        const eventListeners = this.listeners.get(eventName);
        if (eventListeners) {
          const index = eventListeners.indexOf(callback as any);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      }
    };
  }

  /**
   * Subscribe to an event once, then automatically unsubscribe
   * @param eventName Name of the event to listen for
   * @param callback Function to call when event fires
   * @returns Unsubscribe handle
   */
  once<T extends keyof EngineEvents>(eventName: T, callback: EventCallback<T>): EventHandle {
    const wrappedCallback = (payload: any) => {
      callback(payload);
      this.off(eventName, wrappedCallback as EventCallback<T>);
    };

    return this.on(eventName, wrappedCallback as EventCallback<T>);
  }

  /**
   * Unsubscribe from an event
   * @param eventName Name of the event to stop listening for
   * @param callback Function to remove (optional)
   */
  off<T extends keyof EngineEvents>(eventName: T, callback?: EventCallback<T>): void {
    if (!callback) {
      this.listeners.delete(eventName);
      return;
    }

    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback as any);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Subscribe to all events (wildcard)
   * @param callback Function called for every event
   * @returns Unsubscribe handle
   */
  onAny(callback: WildcardCallback): EventHandle {
    this.wildcardListeners.push(callback);
    return {
      unsubscribe: () => {
        const index = this.wildcardListeners.indexOf(callback);
        if (index > -1) {
          this.wildcardListeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param eventName Name of the event to emit
   * @param payload Data to send with the event
   */
  emit<T extends keyof EngineEvents>(eventName: T, payload: EngineEvents[T]): void {
    // Skip emitting if muted
    if (this.muted) {
      return;
    }
    // Record in history if enabled
    if (this.historyEnabled) {
      this.eventHistory.push({
        event: eventName,
        payload,
        timestamp: Date.now()
      });

      // Limit history size
      if (this.eventHistory.length > this.maxHistory) {
        this.eventHistory.shift();
      }
    }

    // Notify specific event listeners
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners && eventListeners.length > 0) {
      // Clone the array to avoid issues if listeners unsubscribe during emission
      eventListeners.slice().forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event callback for ${eventName}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    if (this.wildcardListeners.length > 0) {
      this.wildcardListeners.slice().forEach(callback => {
        try {
          callback(eventName, payload);
        } catch (error) {
          console.error('Error in wildcard event callback:', error);
        }
      });
    }
  }

  /**
   * Get all listeners for a specific event
   * @param eventName Event name to query
   * @returns Array of listener callbacks
   */
  getListeners<T extends keyof EngineEvents>(eventName: T): EventCallback<T>[] {
    return this.listeners.get(eventName) || [];
  }

  /**
   * Check if any listeners exist for an event
   * @param eventName Event name to check
   * @returns True if listeners exist, false otherwise
   */
  hasListeners<T extends keyof EngineEvents>(eventName: T): boolean {
    return this.listeners.has(eventName) && this.listeners.get(eventName)!.length > 0;
  }

  /**
   * Clear all listeners for an event or all listeners
   * @param eventName Optional event name to clear. If omitted, clears all listeners.
   */
  clearListeners<T extends keyof EngineEvents>(eventName?: T): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
      this.wildcardListeners.length = 0;
    }
  }

  /**
   * Get event history for debugging
   * @param limit Maximum number of events to return
   * @returns Array of { event, payload, timestamp } objects
   */
  getHistory(limit?: number): { event: keyof EngineEvents; payload: any; timestamp: number }[] {
    if (limit) {
      return this.eventHistory.slice(-limit).reverse();
    }
    return [...this.eventHistory].reverse();
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  /**
   * Enable or disable event history
   * @param enabled Whether to record events
   */
  setHistoryEnabled(enabled: boolean): void {
    this.historyEnabled = enabled;
    if (!enabled) {
      this.clearHistory();
    }
  }

  /**
   * Set maximum history size
   * @param size Maximum number of events to store
   */
  setMaxHistory(size: number): void {
    this.maxHistory = Math.max(1, size);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }
  }

  /**
   * Get event statistics
   * @returns Object with event frequency data
   */
  getStats() {
    const stats: { [event: string]: number } = {};
    this.eventHistory.forEach(entry => {
      stats[entry.event] = (stats[entry.event] || 0) + 1;
    });
    return stats;
  }

  /**
   * Check if event system is in a consistent state
   * @returns True if system is healthy, false otherwise
   */
  validate(): boolean {
    // Check for orphaned history entries
    if (this.eventHistory.length > this.maxHistory) {
      console.warn('Event history exceeds maximum size');
      return false;
    }

    // Check for memory leaks in listeners
    let totalListeners = 0;
    for (const listeners of this.listeners.values()) {
      totalListeners += listeners.length;
    }
    if (totalListeners > 1000) {
      console.warn('High number of event listeners detected:', totalListeners);
      return false;
    }

    return true;
  }

  /**
   * Create a scoped event bus for a specific context
   * @param scopeName Name for the scope (e.g., entity id, scene name)
   * @returns New EventBus instance scoped to this context
   */
  createScope(scopeName: string): EventBus {
    const scopedBus = new EventBus();
    scopedBus.setHistoryEnabled(this.historyEnabled);
    scopedBus.setMaxHistory(this.maxHistory);
    
    // Forward events from scope to parent with scope info
    scopedBus.onAny((eventName, payload) => {
      this.emit(eventName as any, { ...payload, scope: scopeName });
    });

    return scopedBus;
  }

  /**
   * Get all active event names
   * @returns Array of event names that have listeners
   */
  getActiveEvents(): (keyof EngineEvents)[] {
    return Array.from(this.listeners.keys()).filter(
      eventName => this.listeners.get(eventName)!.length > 0
    );
  }

  /**
   * Get total number of active listeners
   * @returns Count of all event listeners
   */
  getListenerCount(): number {
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.length;
    }
    return count + this.wildcardListeners.length;
  }

  /**
   * Destroy the event bus and clean up all resources
   */
  destroy(): void {
    this.listeners.clear();
    this.wildcardListeners.length = 0;
    this.clearHistory();
  }
  // === BACKWARD COMPATIBILITY METHODS ===
  // These methods provide backward compatibility with older test expectations

  /**
   * Backward compatibility: Clear listeners for an event or all listeners
   * @param eventName Optional event name to clear
   */
  clear<T extends keyof EngineEvents>(eventName?: T): void {
    this.clearListeners(eventName);
    if (eventName) {
      // Clear history for specific event
      this.eventHistory = this.eventHistory.filter(item => item.event !== eventName);
    } else {
      // Clear all history
      this.eventHistory.length = 0;
    }
  }

  /**
   * Backward compatibility: Get event history (read-only property)
   */
  get history(): { event: keyof EngineEvents; payload: any; timestamp: number }[] {
    return this.getHistory();
  }

  /**
   * Backward compatibility: Check if event system is muted
   */
  get muted(): boolean {
    return !this.historyEnabled;
  }

  /**
   * Backward compatibility: Set muted state for event system
   * @param muted Whether to mute event emissions
   */
  setMuted(muted: boolean): void {
    this.setHistoryEnabled(!muted);
  }

  /**
   * Backward compatibility: Get listener count for specific event
   * @param eventName Event name to count listeners for
   * @returns Number of listeners for the event
   */
  listenerCount<T extends keyof EngineEvents>(eventName?: T): number {
    if (eventName) {
      return this.getListeners(eventName).length;
    }
    return 0;
  }

  /**
   * Backward compatibility: Get total number of all listeners
   * @returns Total count of all event listeners
   */
  totalListenerCount(): number {
    return this.getListenerCount();
  }

  /**
   * Get max history limit (for testing)
   */
  getMaxHistory(): number {
    return this.maxHistory;
  }
}
