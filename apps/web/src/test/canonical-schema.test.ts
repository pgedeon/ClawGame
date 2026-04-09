/**
 * Tests for canonical schema and conversion utilities
 */
import { describe, it, expect } from 'vitest';
import {
  toRuntimeEntity,
  toSerializableEntity,
  toRuntimeScene,
  toSerializableScene,
  SerializableEntity,
  Entity,
} from '@clawgame/engine';

describe('Canonical Schema - Conversion Utilities', () => {
  const sampleSerializable: SerializableEntity = {
    id: 'player-1',
    name: 'Hero',
    type: 'player',
    transform: { x: 100, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
    components: {
      movement: { vx: 0, vy: 0, speed: 200 },
      sprite: { width: 32, height: 48, color: '#3b82f6' },
      stats: { hp: 100, maxHp: 100, damage: 10 },
    },
    tags: ['playable'],
  };

  describe('toRuntimeEntity', () => {
    it('converts serializable entity to runtime entity with Map components', () => {
      const entity = toRuntimeEntity(sampleSerializable);

      expect(entity.id).toBe('player-1');
      expect(entity.name).toBe('Hero');
      expect(entity.type).toBe('player');
      expect(entity.transform.x).toBe(100);
      expect(entity.components).toBeInstanceOf(Map);
      expect(entity.components.get('movement')).toEqual({ vx: 0, vy: 0, speed: 200 });
      expect(entity.components.get('stats')).toEqual({ hp: 100, maxHp: 100, damage: 10 });
    });

    it('excludes transform from components map', () => {
      const withTransform = {
        ...sampleSerializable,
        components: { transform: { x: 0, y: 0 }, movement: { vx: 1, vy: 0, speed: 100 } },
      };
      const entity = toRuntimeEntity(withTransform);

      expect(entity.components.has('transform')).toBe(false);
      expect(entity.components.has('movement')).toBe(true);
    });
  });

  describe('toSerializableEntity', () => {
    it('converts runtime entity to plain object', () => {
      const runtime: Entity = {
        id: 'enemy-1',
        name: 'Slime',
        type: 'enemy',
        transform: { x: 300, y: 150 },
        components: new Map([
          ['ai', { type: 'patrol' as const, patrolSpeed: 50 }],
          ['sprite', { width: 32, height: 32, color: '#ef4444' }],
        ]),
      };

      const se = toSerializableEntity(runtime);

      expect(se.id).toBe('enemy-1');
      expect(se.type).toBe('enemy');
      expect(se.transform.x).toBe(300);
      expect(se.components.ai).toEqual({ type: 'patrol', patrolSpeed: 50 });
      expect(se.components.sprite.width).toBe(32);
    });

    it('strips runtime-only image references from sprite component', () => {
      const runtime: Entity = {
        id: 'e1',
        type: 'player',
        transform: { x: 0, y: 0 },
        components: new Map([
          ['sprite', { width: 32, height: 48, color: '#fff', image: {} as any }],
        ]),
      };

      const se = toSerializableEntity(runtime);

      expect(se.components.sprite.image).toBeUndefined();
      expect(se.components.sprite.width).toBe(32);
      expect(se.components.sprite.color).toBe('#fff');
    });

    it('defaults type to custom if missing', () => {
      const runtime: Entity = {
        id: 'e1',
        transform: { x: 0, y: 0 },
        components: new Map(),
      };

      const se = toSerializableEntity(runtime);
      expect(se.type).toBe('custom');
    });
  });

  describe('toRuntimeScene / toSerializableScene', () => {
    it('round-trips a scene through serializable → runtime → serializable', () => {
      const original = {
        name: 'Level 1',
        entities: [sampleSerializable],
        bounds: { width: 800, height: 600 },
      };

      const runtime = toRuntimeScene(original);
      expect(runtime.name).toBe('Level 1');
      expect(runtime.entities.size).toBe(1);
      expect(runtime.entities.get('player-1')).toBeDefined();

      const back = toSerializableScene(runtime, { bounds: original.bounds });
      expect(back.name).toBe('Level 1');
      expect(back.entities.length).toBe(1);
      expect(back.entities[0].id).toBe('player-1');
      expect(back.bounds).toEqual({ width: 800, height: 600 });
    });
  });
});
