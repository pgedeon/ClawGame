/**
 * @clawgame/engine - Navigation System
 *
 * Waypoint-based navigation for entities following defined paths.
 * Integrates with the behavior graph system via new action kinds.
 *
 * Usage:
 *   1. Define NavigationPaths with waypoints
 *   2. Use 'start-navigation' action in behavior graphs to begin following
 *   3. Use 'follow-waypoints' action for direct waypoint following
 *   4. NavigationSystem.update() drives per-entity movement each tick
 */

import { Entity } from '../types';

// ─── Types ───

/** A single waypoint in a navigation path */
export interface Waypoint {
  id: string;
  x: number;
  y: number;
  /** Arrival radius — entity is considered "at" waypoint within this distance */
  radius?: number;
  /** Seconds to wait at this waypoint before proceeding */
  waitTime?: number;
  /** Editor label */
  label?: string;
}

/** A named sequence of waypoints forming a navigation path */
export interface NavigationPath {
  id: string;
  name: string;
  waypoints: Waypoint[];
  /** Whether to loop back to the first waypoint after the last */
  loop?: boolean;
  /** Speed multiplier applied while following this path */
  speedMultiplier?: number;
}

/** Per-entity navigation runtime state (stored as entity component) */
export interface NavigationState {
  /** Which path we're following */
  currentPathId: string | null;
  /** Index of the waypoint we're moving toward */
  currentWaypointIndex: number;
  /** Accumulated wait time at current waypoint */
  waitTimeAccumulator: number;
  /** Whether currently in the "waiting" phase at a waypoint */
  isWaiting: boolean;
}

// ─── Factory helpers ───

let _wpCounter = 0;
let _pathCounter = 0;

/** Create a waypoint */
export function createWaypoint(
  x: number,
  y: number,
  opts: Partial<Omit<Waypoint, 'id'>> = {},
): Waypoint {
  return {
    id: `wp-${++_wpCounter}`,
    x,
    y,
    radius: 20,
    waitTime: 0,
    ...opts,
  };
}

/** Create a navigation path */
export function createNavigationPath(
  name: string,
  waypoints: Waypoint[],
  opts: Partial<Omit<NavigationPath, 'id' | 'name' | 'waypoints'>> = {},
): NavigationPath {
  return {
    id: `navpath-${++_pathCounter}`,
    name,
    waypoints,
    loop: false,
    speedMultiplier: 1.0,
    ...opts,
  };
}

/** Create initial navigation state */
export function createNavigationState(pathId?: string): NavigationState {
  return {
    currentPathId: pathId ?? null,
    currentWaypointIndex: 0,
    waitTimeAccumulator: 0,
    isWaiting: false,
  };
}

// ─── Navigation System ───

/**
 * NavigationSystem manages per-entity waypoint following.
 *
 * Each tick, call `update(entity, paths, state, deltaTime, speed)` to
 * move the entity along its current path. Returns the updated state.
 *
 * The system mutates `entity.transform` directly and returns the new
 * NavigationState (also mutated in-place for efficiency).
 */
export const NavigationSystem = {
  /**
   * Advance entity toward next waypoint.
   * Returns the (mutated) state so callers can persist it.
   */
  update(
    entity: Entity,
    paths: NavigationPath[],
    state: NavigationState,
    deltaTime: number,
    baseSpeed: number = 100,
  ): NavigationState {
    if (!state.currentPathId) return state;

    const path = paths.find((p) => p.id === state.currentPathId);
    if (!path || path.waypoints.length === 0) {
      // Invalid or empty path — stop navigation
      state.currentPathId = null;
      state.currentWaypointIndex = 0;
      return state;
    }

    const wp = path.waypoints[state.currentWaypointIndex];
    if (!wp) {
      // Past end — loop or stop
      if (path.loop) {
        state.currentWaypointIndex = 0;
        state.waitTimeAccumulator = 0;
        state.isWaiting = false;
      } else {
        state.currentPathId = null;
        state.currentWaypointIndex = 0;
      }
      return state;
    }

    // ── Waiting at waypoint ──
    if (state.isWaiting) {
      state.waitTimeAccumulator += deltaTime;
      if (state.waitTimeAccumulator >= (wp.waitTime ?? 0)) {
        state.waitTimeAccumulator = 0;
        state.isWaiting = false;
        state.currentWaypointIndex++;
        // Check if we need to loop
        if (state.currentWaypointIndex >= path.waypoints.length) {
          if (path.loop) {
            state.currentWaypointIndex = 0;
          } else {
            state.currentPathId = null;
            state.currentWaypointIndex = 0;
            return state;
          }
        }
      }
      return state;
    }

    // ── Moving toward waypoint ──
    const dx = wp.x - entity.transform.x;
    const dy = wp.y - entity.transform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const arrivalRadius = wp.radius ?? 20;

    if (dist <= arrivalRadius) {
      // Arrived
      entity.transform.x = wp.x;
      entity.transform.y = wp.y;
      if ((wp.waitTime ?? 0) > 0) {
        state.isWaiting = true;
        state.waitTimeAccumulator = 0;
      } else {
        state.currentWaypointIndex++;
        if (state.currentWaypointIndex >= path.waypoints.length) {
          if (path.loop) {
            state.currentWaypointIndex = 0;
          } else {
            state.currentPathId = null;
            state.currentWaypointIndex = 0;
          }
        }
      }
      return state;
    }

    // Move toward waypoint
    const speed = baseSpeed * (path.speedMultiplier ?? 1.0);
    const step = speed * deltaTime;
    const ratio = Math.min(step / dist, 1);
    entity.transform.x += dx * ratio;
    entity.transform.y += dy * ratio;

    return state;
  },

  /**
   * Get the current target waypoint (or null if not navigating).
   */
  getTarget(
    paths: NavigationPath[],
    state: NavigationState,
  ): Waypoint | null {
    if (!state.currentPathId) return null;
    const path = paths.find((p) => p.id === state.currentPathId);
    if (!path) return null;
    return path.waypoints[state.currentWaypointIndex] ?? null;
  },

  /**
   * Start entity on a path (from beginning).
   */
  startPath(
    state: NavigationState,
    pathId: string,
  ): NavigationState {
    state.currentPathId = pathId;
    state.currentWaypointIndex = 0;
    state.waitTimeAccumulator = 0;
    state.isWaiting = false;
    return state;
  },

  /**
   * Stop navigation.
   */
  stop(state: NavigationState): NavigationState {
    state.currentPathId = null;
    state.currentWaypointIndex = 0;
    state.waitTimeAccumulator = 0;
    state.isWaiting = false;
    return state;
  },

  /**
   * Is the entity currently navigating (has an active path)?
   */
  isActive(state: NavigationState): boolean {
    return state.currentPathId !== null;
  },
};
