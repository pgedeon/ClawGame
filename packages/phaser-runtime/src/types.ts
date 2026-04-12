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
  entities?: CanonicalEntityLike[];
  bounds?: {
    width?: number;
    height?: number;
  };
  spawnPoint?: {
    x?: number;
    y?: number;
  };
  background?: string;
}

export interface PhaserPreviewAsset {
  key: string;
  assetRef: string;
  kind: 'image';
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
    width: number;
    height: number;
  };
  spawnPoint?: {
    x: number;
    y: number;
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
}
