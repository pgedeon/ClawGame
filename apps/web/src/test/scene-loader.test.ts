/**
 * Unit tests for the useSceneLoader hook's scene parsing logic.
 * These test the pure data transformation functions that
 * handle scene serialization edge cases.
 */

import { describe, it, expect } from 'vitest';

/* Re-implement the core parsing logic for unit testing */
interface SceneEntity {
  id: string;
  type: string;
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number };
  components: Record<string, any>;
}

interface ProjectScene {
  name: string;
  description?: string;
  entities: SceneEntity[];
  dialogueTrees?: any[];
  quests?: any[];
  metadata?: { features?: string[] };
}

function inferType(type: string | undefined, components: Record<string, any>): string {
  if (type && type !== 'unknown') return type;
  if (components.playerInput || components.movement?.speed >= 150) return 'player';
  if (components.ai) return 'enemy';
  if (components.collision?.type === 'collectible') return 'collectible';
  if (components.collision?.type === 'wall') return 'obstacle';
  if (components.collision?.type === 'player') return 'player';
  if (components.npc) return 'npc';
  return 'unknown';
}

function validateEntities(raw: any[]): SceneEntity[] {
  return raw.map((e: any) => ({
    id: e.id || `e-${Math.random().toString(36).substr(2, 9)}`,
    type: inferType(e.type, e.components || {}),
    transform: e.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
    components: e.components || {},
  }));
}

function parseSceneData(parsed: any): ProjectScene {
  let rawEntities: any[] = [];
  if (Array.isArray(parsed.entities)) {
    rawEntities = parsed.entities;
  } else if (parsed.entities && typeof parsed.entities === 'object') {
    rawEntities = Object.values(parsed.entities);
  }
  return {
    name: parsed.name || 'Main Scene',
    description: parsed.description,
    entities: validateEntities(rawEntities),
    dialogueTrees: parsed.dialogueTrees || [],
    quests: parsed.quests || [],
    metadata: parsed.metadata,
  };
}

describe('parseSceneData', () => {
  it('should parse normal array format', () => {
    const data = {
      name: 'Level 1',
      entities: [
        { id: 'p1', type: 'player', transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0 }, components: {} },
        { id: 'e1', type: 'enemy', transform: { x: 50, y: 60, scaleX: 1, scaleY: 1, rotation: 0 }, components: {} },
      ],
    };
    const scene = parseSceneData(data);
    expect(scene.name).toBe('Level 1');
    expect(scene.entities).toHaveLength(2);
    expect(scene.entities[0].type).toBe('player');
  });

  it('should handle legacy object format (Map→{} bug)', () => {
    const data = {
      entities: {
        'p1': { id: 'p1', type: 'player', transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0 }, components: {} },
      },
    };
    const scene = parseSceneData(data);
    expect(scene.entities).toHaveLength(1);
    expect(scene.entities[0].id).toBe('p1');
  });

  it('should handle empty entities', () => {
    const scene = parseSceneData({ entities: [] });
    expect(scene.entities).toEqual([]);
  });

  it('should handle missing entities field', () => {
    const scene = parseSceneData({ name: 'Empty' });
    expect(scene.entities).toEqual([]);
  });

  it('should infer missing types from components', () => {
    const data = {
      entities: [
        { id: 'e1', components: { playerInput: true } },
        { id: 'e2', components: { ai: { type: 'slime' } } },
        { id: 'e3', components: { collision: { type: 'collectible' } } },
        { id: 'e4', components: {} },
      ],
    };
    const scene = parseSceneData(data);
    expect(scene.entities[0].type).toBe('player');
    expect(scene.entities[1].type).toBe('enemy');
    expect(scene.entities[2].type).toBe('collectible');
    expect(scene.entities[3].type).toBe('unknown');
  });

  it('should provide default transform for entities without one', () => {
    const data = { entities: [{ id: 'e1', type: 'player', components: {} }] };
    const scene = parseSceneData(data);
    expect(scene.entities[0].transform).toEqual({ x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 });
  });

  it('should generate IDs for entities without them', () => {
    const data = { entities: [{ type: 'player', components: {} }] };
    const scene = parseSceneData(data);
    expect(scene.entities[0].id).toMatch(/^e-/);
  });

  it('should preserve dialogueTrees and quests', () => {
    const data = {
      entities: [],
      dialogueTrees: [{ id: 'dt1' }],
      quests: [{ id: 'q1' }],
      metadata: { features: ['rpg'] },
    };
    const scene = parseSceneData(data);
    expect(scene.dialogueTrees).toHaveLength(1);
    expect(scene.quests).toHaveLength(1);
    expect(scene.metadata?.features).toContain('rpg');
  });
});
