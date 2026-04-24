import { type Scene, type SerializableEntity, toRuntimeEntity, toSerializableEntity } from '@clawgame/engine';

export interface EditorSceneMetadata {
  width?: number;
  height?: number;
  backgroundColor?: string;
  spawnPoint?: { x: number; y: number };
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface EditorScene extends Scene {
  metadata?: EditorSceneMetadata;
}
import { inferEntityType } from './previewScene';

function normalizeTransform(transform: any) {
  return {
    x: typeof transform?.x === 'number' ? transform.x : 0,
    y: typeof transform?.y === 'number' ? transform.y : 0,
    rotation: typeof transform?.rotation === 'number' ? transform.rotation : 0,
    scaleX: typeof transform?.scaleX === 'number' ? transform.scaleX : 1,
    scaleY: typeof transform?.scaleY === 'number' ? transform.scaleY : 1,
  };
}

function normalizeSerializableEntity(entity: any, index: number): SerializableEntity | null {
  if (!entity || typeof entity !== 'object') return null;

  const components = entity.components && typeof entity.components === 'object' ? entity.components : {};
  const id = typeof entity.id === 'string' && entity.id ? entity.id : `entity-${index + 1}`;
  const type = entity.type || inferEntityType(components);

  return {
    id,
    name: typeof entity.name === 'string' ? entity.name : undefined,
    type,
    transform: normalizeTransform(entity.transform),
    components,
    visible: typeof entity.visible === 'boolean' ? entity.visible : undefined,
    locked: typeof entity.locked === 'boolean' ? entity.locked : undefined,
    phaserKind: typeof entity.phaserKind === 'string' ? entity.phaserKind : undefined,
    parent: typeof entity.parent === 'string' ? entity.parent : undefined,
    children: Array.isArray(entity.children) ? entity.children.filter((child: unknown) => typeof child === 'string') : undefined,
    tags: Array.isArray(entity.tags) ? entity.tags.filter((tag: unknown) => typeof tag === 'string') : undefined,
  };
}

export function deserializeEditorScene(sceneContent: any): EditorScene {
  const entities = new Map<string, ReturnType<typeof toRuntimeEntity>>();
  const rawEntities = Array.isArray(sceneContent?.entities)
    ? sceneContent.entities
    : sceneContent?.entities && typeof sceneContent.entities === 'object'
      ? Object.values(sceneContent.entities)
      : [];

  rawEntities.forEach((entity: any, index: number) => {
    const serializable = normalizeSerializableEntity(entity, index);
    if (serializable) {
      entities.set(serializable.id, toRuntimeEntity(serializable));
    }
  });

  const metadata: EditorSceneMetadata = {
    width: typeof sceneContent?.metadata?.width === 'number' ? sceneContent.metadata.width : 800,
    height: typeof sceneContent?.metadata?.height === 'number' ? sceneContent.metadata.height : 600,
    backgroundColor: typeof sceneContent?.metadata?.backgroundColor === 'string' ? sceneContent.metadata.backgroundColor : '#1a1a2e',
    spawnPoint: sceneContent?.metadata?.spawnPoint ?? undefined,
    bounds: sceneContent?.metadata?.bounds ?? undefined,
  };
  return {
    name: typeof sceneContent?.name === 'string' ? sceneContent.name : 'Main Scene',
    entities,
    metadata,
  };
}

export function serializeEditorScene(scene: Scene): string {
  const entities = Array.from(scene.entities.values()).map((entity) => toSerializableEntity(entity));
  const serialized: any = { name: scene.name, entities };
  if ('metadata' in scene && (scene as EditorScene).metadata) {
    serialized.metadata = (scene as EditorScene).metadata;
  }
  return JSON.stringify(serialized, null, 2);
}

export function createDefaultEditorScene(): Scene {
  return deserializeEditorScene({
    name: 'Main Scene',
    entities: [
      {
        id: 'player-1',
        type: 'player',
        transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        components: {
          playerInput: true,
          movement: { vx: 0, vy: 0, speed: 200 },
          sprite: { width: 32, height: 48, color: '#3b82f6' },
          collision: { width: 32, height: 48, type: 'player' },
        },
      },
    ],
  });
}

export function getSceneInitialViewport(scene: Scene): { x: number; y: number; zoom: number } {
  if (scene.entities.size === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;

  scene.entities.forEach((entity) => {
    minX = Math.min(minX, entity.transform.x);
    minY = Math.min(minY, entity.transform.y);
  });

  return {
    x: Math.round(96 - minX),
    y: Math.round(96 - minY),
    zoom: 1,
  };
}
