/**
 * Unit tests for preview scene normalization.
 */

import { describe, it, expect } from 'vitest';
import { inferEntityType, normalizePreviewScene } from '../utils/previewScene';

describe('normalizePreviewScene', () => {
  it('should parse normal array format', () => {
    const data = {
      name: 'Level 1',
      entities: [
        { id: 'p1', type: 'player', transform: { x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0 }, components: {} },
        { id: 'e1', type: 'enemy', transform: { x: 50, y: 60, scaleX: 1, scaleY: 1, rotation: 0 }, components: {} },
      ],
    };
    const scene = normalizePreviewScene(data);
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
    const scene = normalizePreviewScene(data);
    expect(scene.entities).toHaveLength(1);
    expect(scene.entities[0].id).toBe('p1');
  });

  it('should handle empty entities', () => {
    const scene = normalizePreviewScene({ entities: [] });
    expect(scene.entities).toEqual([]);
  });

  it('should handle missing entities field', () => {
    const scene = normalizePreviewScene({ name: 'Empty' });
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
    const scene = normalizePreviewScene(data);
    expect(scene.entities[0].type).toBe('player');
    expect(scene.entities[1].type).toBe('enemy');
    expect(scene.entities[2].type).toBe('collectible');
    expect(scene.entities[3].type).toBe('unknown');
  });

  it('should provide default transform for entities without one', () => {
    const data = { entities: [{ id: 'e1', type: 'player', components: {} }] };
    const scene = normalizePreviewScene(data);
    expect(scene.entities[0].transform).toEqual({ x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 });
  });

  it('should generate IDs for entities without them', () => {
    const data = { entities: [{ type: 'player', components: {} }] };
    const scene = normalizePreviewScene(data);
    expect(scene.entities[0].id).toMatch(/^entity-/);
  });

  it('should preserve dialogueTrees and quests', () => {
    const data = {
      entities: [],
      dialogueTrees: [{ id: 'dt1' }],
      quests: [{ id: 'q1' }],
      metadata: { features: ['rpg'] },
    };
    const scene = normalizePreviewScene(data);
    expect(scene.dialogueTrees).toHaveLength(1);
    expect(scene.quests).toHaveLength(1);
    expect(scene.metadata?.features).toContain('rpg');
  });

  it('should normalize legacy bounds into canonical width and height', () => {
    const scene = normalizePreviewScene({
      entities: [],
      bounds: { left: 0, right: 1024, top: 0, bottom: 768 },
    });

    expect(scene.bounds).toEqual({ width: 1024, height: 768 });
  });
});

describe('inferEntityType', () => {
  it('maps itemDrop entities to the canonical item type', () => {
    expect(inferEntityType({ itemDrop: { id: 'loot-1' } })).toBe('item');
  });

  it('preserves collectible subtypes used by preview flows', () => {
    expect(inferEntityType({ collectible: { type: 'health' } })).toBe('health');
    expect(inferEntityType({ collectible: { type: 'rune' } })).toBe('rune');
  });
});
