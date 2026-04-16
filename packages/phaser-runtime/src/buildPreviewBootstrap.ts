import type {
  CanonicalEntityLike,
  CanonicalSceneLike,
  PhaserPreviewAsset,
  PhaserPreviewBodyConfig,
  PhaserPreviewBootstrap,
  PhaserPreviewBootstrapOptions,
  PhaserPreviewEntity,
} from './types';

const DEFAULT_BOUNDS = { width: 1280, height: 720 };
const DEFAULT_BACKGROUND = '#0f172a';

function getEntityDimensions(entity: CanonicalEntityLike): { width: number; height: number } {
  const sprite = entity.components?.sprite;
  const collision = entity.components?.collision;
  const transform = entity.transform ?? {};

  const width = sprite?.width ?? collision?.width ?? transform.width ?? 32;
  const height = sprite?.height ?? collision?.height ?? transform.height ?? 32;

  return {
    width: typeof width === 'number' ? width : 32,
    height: typeof height === 'number' ? height : 32,
  };
}

function buildBodyConfig(entity: CanonicalEntityLike, width: number, height: number): PhaserPreviewBodyConfig {
  const collision = entity.components?.collision;
  if (!collision || typeof collision !== 'object') {
    return { kind: 'none', width, height };
  }

  // Respect boolean flags as overrides
  if (collision.solid === true) {
    return { kind: 'static', width, height };
  }
  if (collision.trigger === true) {
    return { kind: 'sensor', width, height };
  }

  // Read collision.type directly
  const colType = collision.type;
  if (colType === 'solid') {
    return { kind: 'static', width, height };
  }
  if (colType === 'trigger' || colType === 'sensor') {
    return { kind: 'sensor', width, height };
  }

  // Fallback to entity type for dynamic bodies
  const entityType = entity.type;
  if (entityType === 'player' || entityType === 'enemy' || entityType === 'projectile') {
    return { kind: 'dynamic', width, height };
  }

  return { kind: 'none', width, height };
}

function buildAssetKey(assetRef: string): string {
  return `asset:${assetRef}`;
}

function buildAssetRecord(entity: CanonicalEntityLike, width: number, height: number): PhaserPreviewAsset | null {
  const assetRef = entity.components?.sprite?.assetRef;
  if (typeof assetRef !== 'string' || assetRef.length === 0) {
    return null;
  }

  return {
    key: buildAssetKey(assetRef),
    assetRef,
    kind: 'image',
    width,
    height,
  };
}

function buildEntityRecord(entity: CanonicalEntityLike): PhaserPreviewEntity {
  const transform = entity.transform ?? {};
  const sprite = entity.components?.sprite;
  const { width, height } = getEntityDimensions(entity);
  const assetRef = typeof sprite?.assetRef === 'string' ? sprite.assetRef : undefined;

  return {
    id: entity.id,
    type: entity.type ?? 'unknown',
    x: typeof transform.x === 'number' ? transform.x : 0,
    y: typeof transform.y === 'number' ? transform.y : 0,
    width,
    height,
    rotation: typeof transform.rotation === 'number' ? transform.rotation : 0,
    scaleX: typeof transform.scaleX === 'number' ? transform.scaleX : 1,
    scaleY: typeof transform.scaleY === 'number' ? transform.scaleY : 1,
    ...(assetRef ? { assetKey: buildAssetKey(assetRef), assetRef } : {}),
    ...(typeof sprite?.color === 'string' ? { tint: sprite.color } : {}),
    body: buildBodyConfig(entity, width, height),
  };
}

export function buildPhaserPreviewBootstrap(
  scene: CanonicalSceneLike,
  options: PhaserPreviewBootstrapOptions = {},
): PhaserPreviewBootstrap {
  const entities = Array.isArray(scene.entities) ? scene.entities : [];
  const normalizedEntities = entities.map(buildEntityRecord);
  const assetMap = new Map<string, PhaserPreviewAsset>();

  for (const entity of entities) {
    const { width, height } = getEntityDimensions(entity);
    const asset = buildAssetRecord(entity, width, height);
    if (asset) {
      assetMap.set(asset.assetRef, asset);
    }
  }

  const boundsWidth = scene.bounds?.width;
  const boundsHeight = scene.bounds?.height;
  const defaultBounds = options.defaultBounds ?? DEFAULT_BOUNDS;
  const backgroundColor = scene.background || options.defaultBackgroundColor || DEFAULT_BACKGROUND;

  return {
    sceneKey: options.sceneKey ?? 'clawgame-phaser-preview',
    sceneName: scene.name || 'Main Scene',
    backgroundColor,
    bounds: {
      width: typeof boundsWidth === 'number' ? boundsWidth : defaultBounds.width,
      height: typeof boundsHeight === 'number' ? boundsHeight : defaultBounds.height,
    },
    ...(typeof scene.spawnPoint?.x === 'number' && typeof scene.spawnPoint?.y === 'number'
      ? { spawnPoint: { x: scene.spawnPoint.x, y: scene.spawnPoint.y } }
      : {}),
    assets: Array.from(assetMap.values()),
    entities: normalizedEntities,
    metadata: {
      entityCount: normalizedEntities.length,
      assetCount: assetMap.size,
    },
  };
}
