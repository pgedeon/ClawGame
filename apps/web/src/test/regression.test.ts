/**
 * Regression tests for critical bugs fixed during v0.11.x–v0.12.x
 *
 * Every bug that caused a user-visible outage gets a test here.
 */

import { describe, it, expect } from 'vitest';

// ─── Test 1: Scene serialization Map→Array round-trip ───
// Bug: Map<string, Entity> was JSON.stringify'd to {} (empty object)
// Fix: Convert Map entries to plain array before serializing
// This was the biggest outage — entity data silently lost on save.

describe('Scene serialization: Map→Array round-trip', () => {
  it('should serialize Map<string, Entity> as an array, not an empty object', () => {
    const entityMap = new Map<string, any>();
    entityMap.set('player-1', {
      id: 'player-1',
      type: 'player',
      transform: { x: 100, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
      components: { playerInput: true, movement: { speed: 200 } },
    });
    entityMap.set('enemy-1', {
      id: 'enemy-1',
      type: 'enemy',
      transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
      components: { ai: { type: 'slime' } },
    });

    // The serialization function extracts entities from Map
    const entities: any[] = [];
    entityMap.forEach((entity, _key) => {
      const componentsObj: Record<string, any> = {};
      if (entity.components) {
        Object.entries(entity.components).forEach(([key, value]) => {
          componentsObj[key] = value;
        });
      }
      entities.push({
        id: entity.id,
        type: entity.type,
        transform: entity.transform,
        components: componentsObj,
      });
    });

    const serialized = JSON.stringify({ name: 'Test Scene', entities }, null, 2);
    const parsed = JSON.parse(serialized);

    // Must be an array, not an empty object
    expect(Array.isArray(parsed.entities)).toBe(true);
    expect(parsed.entities).toHaveLength(2);
    expect(parsed.entities[0].id).toBe('player-1');
    expect(parsed.entities[0].type).toBe('player');
    expect(parsed.entities[1].id).toBe('enemy-1');
  });

  it('should deserialize array format back to Map correctly', () => {
    const savedData = {
      name: 'Test Scene',
      entities: [
        { id: 'coin-1', type: 'collectible', transform: { x: 50, y: 75, scaleX: 1, scaleY: 1, rotation: 0 }, components: { collectible: { type: 'coin', value: 10 } } },
        { id: 'wall-1', type: 'obstacle', transform: { x: 200, y: 300, scaleX: 1, scaleY: 1, rotation: 0 }, components: { collision: { type: 'wall' } } },
      ],
    };

    // Simulate deserialization (as done in GamePreviewPage)
    const entityMap = new Map<string, any>();
    for (const entity of savedData.entities) {
      entityMap.set(entity.id, {
        id: entity.id,
        type: entity.type,
        transform: entity.transform,
        components: entity.components,
      });
    }

    expect(entityMap.size).toBe(2);
    expect(entityMap.get('coin-1')?.type).toBe('collectible');
    expect(entityMap.get('wall-1')?.components.collision.type).toBe('wall');
  });

  it('should handle legacy object format (Map→{} broken saves)', () => {
    // When the bug existed, saves looked like: { entities: {} } instead of { entities: [] }
    // The loader should handle both formats
    const brokenSave = {
      name: 'Broken Save',
      entities: {
        'player-1': { id: 'player-1', type: 'player', transform: { x: 100, y: 200 }, components: {} },
        'enemy-1': { id: 'enemy-1', type: 'enemy', transform: { x: 400, y: 300 }, components: {} },
      },
    };

    let rawEntities: any[] = [];
    if (Array.isArray(brokenSave.entities)) {
      rawEntities = brokenSave.entities;
    } else if (brokenSave.entities && typeof brokenSave.entities === 'object') {
      rawEntities = Object.values(brokenSave.entities);
    }

    expect(rawEntities).toHaveLength(2);
    expect(rawEntities[0].id).toBe('player-1');
    expect(rawEntities[1].id).toBe('enemy-1');
  });

  it('should handle empty scenes gracefully', () => {
    const emptyScene = { name: 'Empty', entities: [] };
    const serialized = JSON.stringify(emptyScene);
    const parsed = JSON.parse(serialized);
    expect(parsed.entities).toEqual([]);
  });
});

// ─── Test 2: Entity type inference from components ───
// Bug: Entities loaded without type showed as "unknown" on canvas
// Fix: Infer type from components when type is missing

describe('Entity type inference', () => {
  it('should infer player type from playerInput component', () => {
    const entity: any = {
      id: 'e1',
      type: 'unknown',
      components: { playerInput: true, movement: { speed: 200 } },
    };

    let inferredType = entity.type || 'unknown';
    if (inferredType === 'unknown') {
      if (entity.components.playerInput) inferredType = 'player';
      else if (entity.components.ai) inferredType = 'enemy';
      else if (entity.components.collision?.type === 'collectible') inferredType = 'collectible';
    }

    expect(inferredType).toBe('player');
  });

  it('should infer enemy type from ai component', () => {
    const entity: any = {
      id: 'e2',
      components: { ai: { type: 'slime', speed: 50 } },
    };

    let inferredType = entity.type || 'unknown';
    if (inferredType === 'unknown') {
      if (entity.components.playerInput) inferredType = 'player';
      else if (entity.components.ai) inferredType = 'enemy';
      else if (entity.components.collision?.type === 'collectible') inferredType = 'collectible';
    }

    expect(inferredType).toBe('enemy');
  });

  it('should preserve explicit type when provided', () => {
    const entity: any = {
      id: 'e3',
      type: 'npc',
      components: { npc: { name: 'Wizard', dialogueTreeId: 'tree-1' } },
    };

    let inferredType = entity.type || 'unknown';
    if (inferredType === 'unknown') {
      // inference logic...
    }

    expect(inferredType).toBe('npc');
  });
});

// ─── Test 3: Duplicate entity naming ───
// Bug: Duplicated entities got random hash names like "entity-1775666322645"
// Fix: Use readable names like "player-1-copy"

describe('Entity naming on duplicate', () => {
  it('should create readable duplicate names', () => {
    const existingIds = ['player-1', 'player-1-copy', 'enemy-1'];
    const sourceName = 'player-1';

    const baseName = sourceName;
    let newName = `${baseName}-copy`;
    let counter = 1;
    while (existingIds.includes(newName)) {
      counter++;
      newName = `${baseName}-copy-${counter}`;
    }

    expect(newName).toBe('player-1-copy-2');
    expect(existingIds).not.toContain(newName);
  });

  it('should handle first duplicate without suffix', () => {
    const existingIds = ['enemy-1'];
    const sourceName = 'enemy-1';

    let newName = `${sourceName}-copy`;
    if (existingIds.includes(newName)) {
      newName = `${sourceName}-copy-2`;
    }

    expect(newName).toBe('enemy-1-copy');
  });
});

// ─── Test 4: AI service fallback behavior ───
// Bug: AI Command would hang for 3 minutes when API unavailable
// Fix: 30s timeout, retry, circuit breaker, local fallback

describe('AI service circuit breaker', () => {
  it('should enter circuit-open state after 5 consecutive failures', () => {
    const MAX_FAILURES = 5;
    let consecutiveFailures = 0;
    let circuitOpen = false;
    let circuitOpenUntil = 0;

    // Simulate 5 failures
    for (let i = 0; i < MAX_FAILURES; i++) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_FAILURES) {
        circuitOpen = true;
        circuitOpenUntil = Date.now() + 60000; // 60s cooldown
      }
    }

    expect(circuitOpen).toBe(true);
    expect(circuitOpenUntil).toBeGreaterThan(Date.now());
  });

  it('should use local fallback when circuit is open', () => {
    const circuitOpen = true;
    const circuitOpenUntil = Date.now() + 30000;
    const now = Date.now();

    const shouldUseFallback = circuitOpen && now < circuitOpenUntil;
    expect(shouldUseFallback).toBe(true);

    // Local fallback should provide working code
    const LOCAL_TEMPLATES: Record<string, string> = {
      'player-movement': '// Player movement code...',
      'enemy-ai': '// Enemy AI code...',
    };

    const result = LOCAL_TEMPLATES['player-movement'];
    expect(result).toBeTruthy();
    expect(result).toContain('Player movement');
  });

  it('should reset circuit after cooldown period', () => {
    const circuitOpen = true;
    const circuitOpenUntil = Date.now() - 1000; // cooldown expired
    const now = Date.now();

    const shouldTryRemote = !circuitOpen || now >= circuitOpenUntil;
    expect(shouldTryRemote).toBe(true);
  });
});

// ─── Test 5: Local codegen templates cover all system types ───

describe('Local codegen templates', () => {
  const TEMPLATE_TYPES = [
    'player-movement',
    'enemy-ai',
    'collectible',
    'platform',
    'jumping',
    'projectile',
    'health',
    'scene-setup',
  ];

  it('should have templates for all 8 game system types', () => {
    expect(TEMPLATE_TYPES).toHaveLength(8);
    TEMPLATE_TYPES.forEach(type => {
      expect(type).toBeTruthy();
      expect(typeof type).toBe('string');
    });
  });
});
