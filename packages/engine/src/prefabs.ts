/**
 * @clawgame/engine - Prefab types and utilities
 * Reusable entity templates with override tracking.
 */

import type { Entity } from './types';

export interface PrefabEntity {
  /** Unique ID within this prefab (for internal references) */
  localId: string;
  /** Entity template data (id is treated as localId) */
  entity: Entity;
}

export interface PrefabOverride {
  /** Path to the overridden property (e.g. "transform.x") */
  path: string;
  value: any;
}

export interface PrefabInstance {
  /** Instance ID in the scene */
  instanceId: string;
  /** Reference to prefab definition key */
  prefabKey: string;
  /** Position override */
  transform?: { x: number; y: number; rotation?: number; scaleX?: number; scaleY?: number };
  /** Property overrides indexed by entity localId */
  overrides: Record<string, PrefabOverride[]>;
}

export interface PrefabDefinition {
  key: string;
  name: string;
  entities: PrefabEntity[];
  /** User component schemas attached to this prefab */
  components: UserComponentSchema[];
  createdAt: number;
  updatedAt: number;
}

export interface UserComponentSchema {
  key: string;
  name: string;
  description: string;
  properties: UserComponentProperty[];
}

export interface UserComponentProperty {
  key: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'vector2';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface PrefabLibrary {
  version: 1;
  prefabs: PrefabDefinition[];
}

export function createDefaultPrefabLibrary(): PrefabLibrary {
  return { version: 1, prefabs: [] };
}

export function createPrefabDefinition(key: string, name: string, entities: Entity[]): PrefabDefinition {
  const now = Date.now();
  return {
    key,
    name,
    entities: entities.map((entity, i) => ({
      localId: entity.id || `e-${i}`,
      entity: { ...entity },
    })),
    components: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addPrefab(lib: PrefabLibrary, prefab: PrefabDefinition): PrefabLibrary {
  return { ...lib, prefabs: [...lib.prefabs, prefab] };
}

export function removePrefab(lib: PrefabLibrary, key: string): PrefabLibrary {
  return { ...lib, prefabs: lib.prefabs.filter((p) => p.key !== key) };
}

export function updatePrefab(lib: PrefabLibrary, key: string, patch: Partial<PrefabDefinition>): PrefabLibrary {
  return {
    ...lib,
    prefabs: lib.prefabs.map((p) => (p.key === key ? { ...p, ...patch, updatedAt: Date.now() } : p)),
  };
}

/** Instantiate a prefab into scene entities */
export function instantiatePrefab(prefab: PrefabDefinition, instanceId: string, x: number, y: number): Entity[] {
  return prefab.entities.map(({ localId, entity }) => ({
    ...entity,
    id: `${instanceId}-${localId}`,
    name: entity.name ? `${instanceId}-${entity.name}` : undefined,
    transform: {
      ...entity.transform,
      x: (entity.transform.x ?? 0) + x,
      y: (entity.transform.y ?? 0) + y,
    },
  }));
}

/** Create a user component schema */
export function createUserComponentSchema(key: string, name: string, description: string, properties: UserComponentProperty[] = []): UserComponentSchema {
  return { key, name, description, properties };
}

/** Compile prefab instantiation to Phaser code */
export function generatePrefabCode(prefab: PrefabDefinition, instanceId: string, x: number, y: number): string[] {
  const lines: string[] = [];
  lines.push(`    // Prefab: ${prefab.name}`);
  for (const { entity } of prefab.entities) {
    const safeName = (entity.name || 'entity').replace(/[^a-zA-Z0-9_]/g, '_');
    const px = (entity.transform.x ?? 0) + x;
    const py = (entity.transform.y ?? 0) + y;
    const sprite = entity.components instanceof Map ? entity.components.get('sprite') as any : undefined;
    const key = sprite?.assetId || safeName;
    lines.push(`    const ${instanceId}_${safeName} = this.add.sprite(${px}, ${py}, '${key}');`);
  }
  return lines;
}

export function serializePrefabLibrary(lib: PrefabLibrary): string {
  return JSON.stringify(lib, null, 2);
}

export function parsePrefabLibrary(json: string): PrefabLibrary {
  const parsed = JSON.parse(json) as PrefabLibrary;
  if (parsed.version !== 1) throw new Error(`Unsupported prefab library version: ${parsed.version}`);
  return parsed;
}
