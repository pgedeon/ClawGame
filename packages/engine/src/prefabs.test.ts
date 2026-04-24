import {
  createDefaultPrefabLibrary,
  createPrefabDefinition,
  addPrefab,
  removePrefab,
  updatePrefab,
  instantiatePrefab,
  createUserComponentSchema,
  generatePrefabCode,
  serializePrefabLibrary,
  parsePrefabLibrary,
} from '../src/prefabs';
import type { Entity } from '../src/types';

function makeEntity(id: string, name: string, x: number, y: number): Entity {
  return {
    id,
    name,
    type: 'player',
    transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
    components: new Map([['sprite', { assetId: `${name}-sprite` }]]),
  };
}

describe('prefabs', () => {
  describe('prefab library CRUD', () => {
    it('adds and removes prefabs', () => {
      let lib = createDefaultPrefabLibrary();
      const prefab = createPrefabDefinition('enemy', 'Enemy', [makeEntity('e1', 'body', 0, 0)]);
      lib = addPrefab(lib, prefab);
      expect(lib.prefabs).toHaveLength(1);
      lib = removePrefab(lib, 'enemy');
      expect(lib.prefabs).toHaveLength(0);
    });

    it('updates a prefab', () => {
      let lib = createDefaultPrefabLibrary();
      const prefab = createPrefabDefinition('p1', 'Prefab 1', []);
      lib = addPrefab(lib, prefab);
      lib = updatePrefab(lib, 'p1', { name: 'Updated' });
      expect(lib.prefabs[0].name).toBe('Updated');
      expect(lib.prefabs[0].updatedAt).toBeGreaterThanOrEqual(prefab.createdAt);
    });
  });

  describe('instantiatePrefab', () => {
    it('creates entities at offset position', () => {
      const prefab = createPrefabDefinition('player', 'Player', [makeEntity('e1', 'hero', 10, 20)]);
      const entities = instantiatePrefab(prefab, 'inst-1', 100, 200);
      expect(entities).toHaveLength(1);
      expect(entities[0].transform.x).toBe(110);
      expect(entities[0].transform.y).toBe(220);
      expect(entities[0].id).toContain('inst-1');
    });

    it('handles multi-entity prefabs', () => {
      const prefab = createPrefabDefinition('tank', 'Tank', [
        makeEntity('body', 'body', 0, 0),
        makeEntity('turret', 'turret', 16, -8),
      ]);
      const entities = instantiatePrefab(prefab, 't-1', 50, 50);
      expect(entities).toHaveLength(2);
    });
  });

  describe('user components', () => {
    it('creates a component schema', () => {
      const schema = createUserComponentSchema('health', 'Health', 'Entity health', [
        { key: 'hp', name: 'HP', type: 'number', defaultValue: 100, min: 0, max: 999 },
        { key: 'invulnerable', name: 'Invulnerable', type: 'boolean', defaultValue: false },
      ]);
      expect(schema.properties).toHaveLength(2);
      expect(schema.properties[0].defaultValue).toBe(100);
    });
  });

  describe('code generation', () => {
    it('generates instantiation code', () => {
      const prefab = createPrefabDefinition('enemy', 'Enemy', [makeEntity('e1', 'body', 10, 20)]);
      const code = generatePrefabCode(prefab, 'enemy-1', 100, 200);
      expect(code.some((l) => l.includes('Prefab: Enemy'))).toBe(true);
      expect(code.some((l) => l.includes('110, 220'))).toBe(true);
    });
  });

  describe('serialize/parse', () => {
    it('round-trips', () => {
      let lib = createDefaultPrefabLibrary();
      lib = addPrefab(lib, createPrefabDefinition('p1', 'P', []));
      const json = serializePrefabLibrary(lib);
      const parsed = parsePrefabLibrary(json);
      expect(parsed.prefabs).toHaveLength(1);
    });

    it('throws on wrong version', () => {
      expect(() => parsePrefabLibrary('{"version":2}')).toThrow('Unsupported');
    });
  });
});
