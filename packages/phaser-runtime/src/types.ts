export interface CanonicalEntityLike {
  id: string;
  name?: string;
  type?: string;
  transform?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
  };
  components?: Record<string, any>;
}

export interface CanonicalSceneLike {
  name?: string;
  entities?: CanonicalEntityLike[] | Map<string, CanonicalEntityLike>;
  bounds?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  spawnPoint?: {
    x?: number;
    y?: number;
  };
  background?: string;
  camera?: {
    scrollX?: number;
    scrollY?: number;
    zoom?: number;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  physics?: {
    gravity?: {
      x: number;
      y: number;
    };
    debug?: boolean;
  };
}

export interface PhaserPreviewAsset {
  key: string;
  assetRef: string;
  kind: 'image' | 'spritesheet' | 'atlas';
  loadUrl: string;
  mimeType?: string;
  frameData?: { frameWidth: number; frameHeight: number; endFrame?: number };
  atlasMeta?: { atlasUrl: string; type: 'json' | 'xml' };
  width: number;
  height: number;
}

export interface PhaserPreviewBodyConfig {
  kind: 'dynamic' | 'static' | 'sensor' | 'none';
  width: number;
  height: number;
}

export interface PhaserPreviewEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  assetKey?: string;
  assetRef?: string;
  tint?: string;
  body: PhaserPreviewBodyConfig;
}

export interface PhaserPreviewBootstrap {
  sceneKey: string;
  sceneName: string;
  backgroundColor: string;
  bounds: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  };
  spawnPoint?: {
    x: number;
    y: number;
  };
  camera?: {
    scrollX?: number;
    scrollY?: number;
    zoom?: number;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  physics?: {
    gravity?: {
      x: number;
      y: number;
    };
    debug?: boolean;
  };
  assets: PhaserPreviewAsset[];
  entities: PhaserPreviewEntity[];
  metadata: {
    entityCount: number;
    assetCount: number;
  };
}

export interface PhaserPreviewBootstrapOptions {
  sceneKey?: string;
  defaultBounds?: {
    width: number;
    height: number;
  };
  defaultBackgroundColor?: string;
  assetBaseUrl?: string;
  assetUrlResolver?: PhaserPreviewAssetUrlResolver;
}

export type PhaserPreviewAssetUrlResolver = (assetRef: string, entity: CanonicalEntityLike) => string;

export interface PhaserRuntimeError {
  phase: string;
  error: unknown;
  context?: Record<string, unknown>;
}

export interface PhaserRuntimeErrorReporter {
  reportError(phase: string, error: unknown, context?: Record<string, unknown>): void;
}
