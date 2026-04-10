/**
 * @clawgame/engine - Navigation System Tests
 *
 * Tests for waypoint-based navigation and behavior graph integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWaypoint,
  createNavigationPath,
  NavigationSystem,
  createNavigationState,
  type Waypoint,
  type NavigationPath,
  type NavigationState,
} from './NavigationSystem';
import { Entity, Transform } from '../types';

describe('Navigation System', () => {
  describe('Waypoint Creation', () => {
    it('should create a waypoint with default values', () => {
      const waypoint = createWaypoint(100, 200);
      
      expect(waypoint.id).toMatch(/^wp-\d+$/);
      expect(waypoint.x).toBe(100);
      expect(waypoint.y).toBe(200);
      expect(waypoint.radius).toBe(20);
      expect(waypoint.waitTime).toBe(0);
    });

    it('should create a waypoint with custom values', () => {
      const waypoint = createWaypoint(100, 200, {
        radius: 30,
        waitTime: 2,
        label: 'Custom Waypoint',
      });
      
      expect(waypoint.x).toBe(100);
      expect(waypoint.y).toBe(200);
      expect(waypoint.radius).toBe(30);
      expect(waypoint.waitTime).toBe(2);
      expect(waypoint.label).toBe('Custom Waypoint');
    });
  });

  describe('Navigation Path Creation', () => {
    it('should create a navigation path', () => {
      const waypoints = [
        createWaypoint(100, 100),
        createWaypoint(200, 200),
        createWaypoint(300, 100),
      ];
      
      const path = createNavigationPath('Test Path', waypoints);
      
      expect(path.id).toMatch(/^navpath-\d+$/);
      expect(path.name).toBe('Test Path');
      expect(path.waypoints).toHaveLength(3);
      expect(path.loop).toBe(false);
      expect(path.speedMultiplier).toBe(1);
    });

    it('should create a navigation path with custom options', () => {
      const waypoints = [createWaypoint(100, 100)];
      
      const path = createNavigationPath('Looping Path', waypoints, {
        loop: true,
        speedMultiplier: 1.5,
      });
      
      expect(path.loop).toBe(true);
      expect(path.speedMultiplier).toBe(1.5);
    });
  });

  describe('Navigation State Management', () => {
    it('should create initial navigation state', () => {
      const state = createNavigationState('test-path');
      
      expect(state.currentPathId).toBe('test-path');
      expect(state.currentWaypointIndex).toBe(0);
      expect(state.waitTimeAccumulator).toBe(0);
      expect(state.isWaiting).toBe(false);
    });

    it('should create empty navigation state', () => {
      const state = createNavigationState();
      
      expect(state.currentPathId).toBe(null);
      expect(state.currentWaypointIndex).toBe(0);
      expect(state.waitTimeAccumulator).toBe(0);
      expect(state.isWaiting).toBe(false);
    });
  });

  describe('Navigation Update', () => {
    let entity: Entity;
    let path: NavigationPath;
    let state: NavigationState;

    beforeEach(() => {
      entity = {
        id: 'test-entity',
        transform: { x: 50, y: 50 },
        components: new Map(),
      };
      
      path = createNavigationPath('Simple Path', [
        createWaypoint(100, 100),
        createWaypoint(200, 200),
      ]);
      
      state = createNavigationState(path.id);
    });

    it('should not update when not navigating', () => {
      state = createNavigationState();
      const originalState = { ...state };
      
      const result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.016,
        100
      );
      
      expect(result).toEqual(originalState);
    });

    it('should move to first waypoint', () => {
      const originalX = entity.transform.x;
      const originalY = entity.transform.y;
      
      const result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.016,
        100
      );
      
      // Should have moved toward waypoint
      expect(entity.transform.x).toBeGreaterThan(originalX);
      expect(entity.transform.y).toBeGreaterThan(originalY);
      expect(result.currentPathId).toBe(path.id);
      expect(result.currentWaypointIndex).toBe(0);
    });

    it('should reach waypoint when close enough', () => {
      // Move entity close to first waypoint
      entity.transform.x = 105;
      entity.transform.y = 105;
      
      const result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.016,
        100
      );
      
      // Should snap to waypoint position
      expect(entity.transform.x).toBe(100);
      expect(entity.transform.y).toBe(100);
      expect(result.currentWaypointIndex).toBe(1);
    });

    it('should handle wait time at waypoint', () => {
      // Move entity close to first waypoint with wait time
      path.waypoints[0].waitTime = 1;
      entity.transform.x = 105;
      entity.transform.y = 105;
      
      // First update - within radius, snaps to waypoint and starts waiting
      let result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.5,
        100
      );
      
      expect(result.isWaiting).toBe(true);
      expect(result.waitTimeAccumulator).toBe(0);
      expect(result.currentWaypointIndex).toBe(0);
      
      // Second update - accumulate wait time (0.5s)
      result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.5,
        100
      );
      
      expect(result.waitTimeAccumulator).toBe(0.5);
      expect(result.currentWaypointIndex).toBe(0);
      expect(result.isWaiting).toBe(true);
      
      // Third update - accumulate more wait time (1.0s total, wait complete)
      result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.5,
        100
      );
      
      expect(result.waitTimeAccumulator).toBe(0);
      expect(result.currentWaypointIndex).toBe(1);
      expect(result.isWaiting).toBe(false);
    });

    it('should loop path when loop is true', () => {
      path.loop = true;
      
      // Move to end of path
      entity.transform.x = 205;
      entity.transform.y = 205;
      state.currentWaypointIndex = 1;
      
      const result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.016,
        100
      );
      
      expect(result.currentWaypointIndex).toBe(0); // Loop back to start
    });

    it('should stop navigation when path is complete and not looping', () => {
      // Move to end of path
      entity.transform.x = 205;
      entity.transform.y = 205;
      state.currentWaypointIndex = 1;
      
      const result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.016,
        100
      );
      
      expect(result.currentPathId).toBe(null);
      expect(result.currentWaypointIndex).toBe(0);
    });
  });

  describe('Navigation Helper Functions', () => {
    let path: NavigationPath;
    let state: NavigationState;

    beforeEach(() => {
      path = createNavigationPath('Test Path', [
        createWaypoint(100, 100),
        createWaypoint(200, 200),
      ]);
      
      state = createNavigationState(path.id);
    });

    it('should get current target waypoint', () => {
      const target = NavigationSystem.getTarget([path], state);
      
      expect(target).toBeDefined();
      expect(target!.x).toBe(100);
      expect(target!.y).toBe(100);
    });

    it('should return null when no active path', () => {
      state = createNavigationState();
      
      const target = NavigationSystem.getTarget([path], state);
      
      expect(target).toBe(null);
    });

    it('should return null when target out of bounds', () => {
      state.currentWaypointIndex = 10;
      
      const target = NavigationSystem.getTarget([path], state);
      
      expect(target).toBe(null);
    });

    it('should start entity on path', () => {
      state = createNavigationState();
      
      const result = NavigationSystem.startPath(state, 'new-path');
      
      expect(result.currentPathId).toBe('new-path');
      expect(result.currentWaypointIndex).toBe(0);
      expect(result.isWaiting).toBe(false);
    });

    it('should stop navigation', () => {
      state = createNavigationState('active-path');
      
      const result = NavigationSystem.stop(state);
      
      expect(result.currentPathId).toBe(null);
      expect(result.currentWaypointIndex).toBe(0);
      expect(result.isWaiting).toBe(false);
    });

    it('should detect active navigation', () => {
      expect(NavigationSystem.isActive(state)).toBe(true);
      
      const emptyState = createNavigationState();
      expect(NavigationSystem.isActive(emptyState)).toBe(false);
    });
  });

  describe('Path Edge Cases', () => {
    let entity: Entity;
    let path: NavigationPath;
    let state: NavigationState;

    beforeEach(() => {
      entity = {
        id: 'test-entity',
        transform: { x: 0, y: 0 },
        components: new Map(),
      };
      
      path = createNavigationPath('Empty Path', []);
      state = createNavigationState(path.id);
    });

    it('should handle empty waypoint list', () => {
      const result = NavigationSystem.update(
        entity,
        [path],
        state,
        0.016,
        100
      );
      
      expect(result.currentPathId).toBe(null);
    });

    it('should handle single waypoint path', () => {
      // Place entity within arrival radius of the single waypoint
      const singlePath = createNavigationPath('Single WP', [
        createWaypoint(100, 100),
      ]);
      entity.transform.x = 105;
      entity.transform.y = 105;
      state = createNavigationState(singlePath.id);
      
      const result = NavigationSystem.update(
        entity,
        [singlePath],
        state,
        0.016,
        100
      );
      
      expect(entity.transform.x).toBe(100);
      expect(entity.transform.y).toBe(100);
      expect(result.currentPathId).toBe(null); // Path complete
    });
  });

  describe('Speed Multiplier', () => {
    it('should use speed multiplier for movement', () => {
      // Entity at (0,0), waypoint at (100,0) — 100px distance
      const normalPath = createNavigationPath('Normal Path', [
        createWaypoint(100, 0),
      ]);
      const fastPath = createNavigationPath('Fast Path', [
        createWaypoint(100, 0),
      ], {
        speedMultiplier: 2.0,
      });

      const normalEntity = { id: 'n', transform: { x: 0, y: 0 }, components: new Map() };
      const fastEntity = { id: 'f', transform: { x: 0, y: 0 }, components: new Map() };

      NavigationSystem.update(
        normalEntity,
        [normalPath],
        createNavigationState(normalPath.id),
        0.1,
        100,
      );
      NavigationSystem.update(
        fastEntity,
        [fastPath],
        createNavigationState(fastPath.id),
        0.1,
        100,
      );

      // Normal: 100*1.0*0.1 = 10px → x≈10
      // Fast: 100*2.0*0.1 = 20px → x≈20
      expect(fastEntity.transform.x).toBeGreaterThan(normalEntity.transform.x);
    });
  });
});
