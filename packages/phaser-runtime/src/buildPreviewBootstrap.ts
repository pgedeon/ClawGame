import type {
  CanonicalEntityLike,
  CanonicalSceneLike,
  PhaserPreviewAsset,
  PhaserPreviewAssetUrlResolver,
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

function normalizeAssetUrl(assetRef: string, options: PhaserPreviewBootstrapOptions): string {
  if (/^(?:[a-z]+:)?\/\//i.test(assetRef) || assetRef.startsWith('data:')) {
    return assetRef;
  }

  if (options.assetBaseUrl) {
    return `${options.assetBaseUrl.replace(/\/$/, '')}/${assetRef.replace(/^\//, '')}`;
  }

  if (assetRef.startsWith('./') || assetRef.startsWith('../') || assetRef.startsWith('/')) {
    return assetRef;
  }

  return `./${assetRef}`;
}

function resolveAssetUrl(
  assetRef: string,
  entity: CanonicalEntityLike,
  options: PhaserPreviewBootstrapOptions,
): string {
  const resolver: PhaserPreviewAssetUrlResolver | undefined = options.assetUrlResolver;
  return resolver ? resolver(assetRef, entity) : normalizeAssetUrl(assetRef, options);
}

export function buildAssetRecord(
  entity: CanonicalEntityLike,
  width: number,
  height: number,
  options: PhaserPreviewBootstrapOptions = {},
): PhaserPreviewAsset | null {
  const assetRef = entity.components?.sprite?.assetRef;
  if (typeof assetRef !== 'string' || assetRef.length === 0) {
    return null;
  }

  const sprite = entity.components?.sprite;
  const frameData = sprite?.frameData;
  const atlasMeta = sprite?.atlasMeta;
  const normalizedFrameData =
    frameData &&
    typeof frameData.frameWidth === 'number' &&
    typeof frameData.frameHeight === 'number'
      ? {
          frameWidth: frameData.frameWidth,
          frameHeight: frameData.frameHeight,
          ...(typeof frameData.endFrame === 'number' ? { endFrame: frameData.endFrame } : {}),
        }
      : undefined;
  const normalizedAtlasMeta =
    atlasMeta &&
    typeof atlasMeta.atlasUrl === 'string' &&
    (atlasMeta.type === 'json' || atlasMeta.type === 'xml')
      ? { atlasUrl: atlasMeta.atlasUrl, type: atlasMeta.type as 'json' | 'xml' }
      : undefined;

  return {
    key: buildAssetKey(assetRef),
    assetRef,
    kind: normalizedAtlasMeta ? 'atlas' : normalizedFrameData ? 'spritesheet' : 'image',
    loadUrl: resolveAssetUrl(assetRef, entity, options),
    ...(typeof sprite?.mimeType === 'string' ? { mimeType: sprite.mimeType } : {}),
    ...(normalizedFrameData ? { frameData: normalizedFrameData } : {}),
    ...(normalizedAtlasMeta ? { atlasMeta: normalizedAtlasMeta } : {}),
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
  const entities = scene.entities instanceof Map
    ? Array.from(scene.entities.values())
    : Array.isArray(scene.entities)
      ? scene.entities
      : [];
  const normalizedEntities = entities.map(buildEntityRecord);
  const assetMap = new Map<string, PhaserPreviewAsset>();

  for (const entity of entities) {
    const { width, height } = getEntityDimensions(entity);
    const asset = buildAssetRecord(entity, width, height, options);
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
      ...(typeof scene.bounds?.x === 'number' ? { x: scene.bounds.x } : {}),
      ...(typeof scene.bounds?.y === 'number' ? { y: scene.bounds.y } : {}),
      width: typeof boundsWidth === 'number' ? boundsWidth : defaultBounds.width,
      height: typeof boundsHeight === 'number' ? boundsHeight : defaultBounds.height,
    },
    ...(typeof scene.spawnPoint?.x === 'number' && typeof scene.spawnPoint?.y === 'number'
      ? { spawnPoint: { x: scene.spawnPoint.x, y: scene.spawnPoint.y } }
      : {}),
    ...(scene.camera ? { camera: { ...scene.camera, ...(scene.camera.bounds ? { bounds: { ...scene.camera.bounds } } : {}) } } : {}),
    ...(scene.physics ? { physics: { ...scene.physics, ...(scene.physics.gravity ? { gravity: { ...scene.physics.gravity } } : {}) } } : {}),
    assets: Array.from(assetMap.values()),
    entities: normalizedEntities,
    metadata: {
      entityCount: normalizedEntities.length,
      assetCount: assetMap.size,
    },
  };
}
