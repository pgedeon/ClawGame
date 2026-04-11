import type { EntityType, SerializableEntity, SerializableScene } from '@clawgame/engine';

export interface DialogueTree {
  id: string;
  startNode: string;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
}

export interface DialogueChoice {
  text: string;
  nextNode: string;
  condition?: string;
}

export interface DialogueEffect {
  type: 'give-item' | 'start-quest' | 'complete-quest' | 'modify-stats';
  target: string;
  value?: unknown;
}

export interface Platform {
  id: string;
  transform: SerializableEntity['transform'];
  width: number;
  height: number;
  properties?: {
    oneWay?: boolean;
    slippery?: boolean;
    bounceFactor?: number;
  };
}

export interface CollectibleData {
  id: string;
  transform: SerializableEntity['transform'];
  type: 'coin' | 'gem' | 'health' | 'rune';
  value: number;
  respawn?: boolean;
  collectEffects?: {
    healAmount?: number;
    scoreBonus?: number;
  };
}

export interface Waypoint {
  id: string;
  transform: SerializableEntity['transform'];
  connectedTo: string[];
  type?: 'patrol' | 'path';
}

export interface PreviewSceneData extends SerializableScene {
  description?: string;
  dialogueTrees?: DialogueTree[];
  platforms?: Platform[];
  collectibles?: CollectibleData[];
  waypoints?: Waypoint[];
  quests?: unknown[];
  metadata?: Record<string, unknown>;
}

const DEFAULT_TRANSFORM: SerializableEntity['transform'] = {
  x: 400,
  y: 300,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

const VALID_ENTITY_TYPES = new Set<EntityType>([
  'player',
  'enemy',
  'npc',
  'collectible',
  'item',
  'health',
  'rune',
  'obstacle',
  'platform',
  'trigger',
  'camera',
  'custom',
  'unknown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeBounds(bounds: unknown): SerializableScene['bounds'] | undefined {
  if (!isRecord(bounds)) return undefined;

  if (typeof bounds.width === 'number' && typeof bounds.height === 'number') {
    return { width: bounds.width, height: bounds.height };
  }

  if (
    typeof bounds.left === 'number' &&
    typeof bounds.right === 'number' &&
    typeof bounds.top === 'number' &&
    typeof bounds.bottom === 'number'
  ) {
    return {
      width: Math.max(0, bounds.right - bounds.left),
      height: Math.max(0, bounds.bottom - bounds.top),
    };
  }

  return undefined;
}

function normalizeSpawnPoint(spawnPoint: unknown): SerializableScene['spawnPoint'] | undefined {
  if (!isRecord(spawnPoint)) return undefined;

  if (typeof spawnPoint.x === 'number' && typeof spawnPoint.y === 'number') {
    return { x: spawnPoint.x, y: spawnPoint.y };
  }

  if (isRecord(spawnPoint.transform)) {
    const { x, y } = spawnPoint.transform;
    if (typeof x === 'number' && typeof y === 'number') {
      return { x, y };
    }
  }

  return undefined;
}

function normalizeTransform(transform: unknown): SerializableEntity['transform'] {
  if (!isRecord(transform)) {
    return { ...DEFAULT_TRANSFORM };
  }

  return {
    x: typeof transform.x === 'number' ? transform.x : DEFAULT_TRANSFORM.x,
    y: typeof transform.y === 'number' ? transform.y : DEFAULT_TRANSFORM.y,
    width: typeof transform.width === 'number' ? transform.width : undefined,
    height: typeof transform.height === 'number' ? transform.height : undefined,
    scaleX: typeof transform.scaleX === 'number' ? transform.scaleX : DEFAULT_TRANSFORM.scaleX,
    scaleY: typeof transform.scaleY === 'number' ? transform.scaleY : DEFAULT_TRANSFORM.scaleY,
    rotation: typeof transform.rotation === 'number' ? transform.rotation : DEFAULT_TRANSFORM.rotation,
  };
}

export function inferEntityType(components: Record<string, unknown>): EntityType {
  if (components.playerInput) return 'player';
  if (components.ai) return 'enemy';
  if (components.npc) return 'npc';
  if (components.itemDrop) return 'item';
  if (components.camera) return 'camera';
  if (components.trigger) return 'trigger';

  const collectible = isRecord(components.collectible) ? components.collectible : null;
  if (collectible) {
    const type = collectible.type;
    if (type === 'health' || type === 'rune') return type;
    return 'collectible';
  }

  const collision = isRecord(components.collision) ? components.collision : null;
  if (collision) {
    switch (collision.type) {
      case 'collectible':
        return 'collectible';
      case 'wall':
        return 'obstacle';
      case 'player':
        return 'player';
      case 'trigger':
        return 'trigger';
      case 'static':
        return 'platform';
      default:
        return 'obstacle';
    }
  }

  return 'unknown';
}

function normalizeEntity(entity: unknown): SerializableEntity {
  const data = isRecord(entity) ? entity : {};
  const components = isRecord(data.components) ? { ...data.components } : {};
  const explicitType = typeof data.type === 'string' && VALID_ENTITY_TYPES.has(data.type as EntityType)
    ? data.type as EntityType
    : undefined;

  return {
    id: typeof data.id === 'string' && data.id.length > 0
      ? data.id
      : `entity-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name: typeof data.name === 'string' ? data.name : undefined,
    type: explicitType && explicitType !== 'unknown' ? explicitType : inferEntityType(components),
    transform: normalizeTransform(data.transform),
    components,
    parent: typeof data.parent === 'string' ? data.parent : undefined,
    children: Array.isArray(data.children) ? data.children.filter((child): child is string => typeof child === 'string') : undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
  };
}

export function normalizePreviewScene(data: unknown): PreviewSceneData {
  const scene = isRecord(data) ? data : {};
  const rawEntities = Array.isArray(scene.entities)
    ? scene.entities
    : isRecord(scene.entities)
      ? Object.values(scene.entities)
      : [];

  return {
    name: typeof scene.name === 'string' && scene.name.trim().length > 0 ? scene.name : 'Main Scene',
    description: typeof scene.description === 'string' ? scene.description : undefined,
    entities: rawEntities.map(normalizeEntity),
    bounds: normalizeBounds(scene.bounds),
    spawnPoint: normalizeSpawnPoint(scene.spawnPoint),
    background: typeof scene.background === 'string' ? scene.background : undefined,
    dialogueTrees: asArray<DialogueTree>(scene.dialogueTrees),
    platforms: asArray<Platform>(scene.platforms),
    collectibles: asArray<CollectibleData>(scene.collectibles),
    waypoints: asArray<Waypoint>(scene.waypoints),
    quests: asArray(scene.quests),
    metadata: isRecord(scene.metadata) ? scene.metadata : undefined,
  };
}

export function createDefaultPreviewScene(): PreviewSceneData {
  return {
    name: 'Main Scene',
    entities: [
      {
        id: 'player',
        type: 'player',
        transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
        components: {
          playerInput: true,
          movement: { speed: 200 },
          stats: { hp: 100, maxHp: 100, damage: 10 },
          sprite: { width: 32, height: 48, color: '#3b82f6' },
        },
      },
      {
        id: 'enemy-1',
        type: 'enemy',
        transform: { x: 600, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
        components: {
          ai: { speed: 50, type: 'patrol' },
          stats: { hp: 30, maxHp: 30, damage: 10 },
          sprite: { width: 32, height: 32, color: '#ef4444' },
          enemyType: 'slime',
        },
      },
      {
        id: 'coin-1',
        type: 'collectible',
        transform: { x: 500, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
        components: {
          collectible: { type: 'coin', value: 10 },
          sprite: { width: 16, height: 16, color: '#f59e0b' },
        },
      },
    ],
    dialogueTrees: [],
    platforms: [],
    collectibles: [],
    waypoints: [],
  };
}
