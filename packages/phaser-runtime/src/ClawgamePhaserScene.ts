import { Scene, GameObjects } from 'phaser';
import type {
  PhaserPreviewAsset,
  PhaserPreviewBootstrap,
  PhaserPreviewEntity,
  PhaserRuntimeError,
  PhaserRuntimeErrorReporter,
} from './types';

export const consolePhaserRuntimeErrorReporter: PhaserRuntimeErrorReporter = {
  reportError(phase, error, context) {
    console.error(`[Clawgame Phaser Runtime] ${phase}`, error, context ?? {});
  },
};

export interface ClawgamePhaserSceneOptions {
  key?: string;
  reporter?: PhaserRuntimeErrorReporter;
}

function isSceneOptions(value: unknown): value is ClawgamePhaserSceneOptions {
  return !!value && typeof value === 'object' && ('reporter' in value || 'key' in value);
}

/**
 * ClawgamePhaserScene — base preview scene extending Phaser Scene.
 * Renders canonical entities as color-coded shapes.
 */
export class ClawgamePhaserScene extends Scene {
  protected bootstrap: PhaserPreviewBootstrap | null = null;
  private entitySprites: Map<string, GameObjects.Rectangle | GameObjects.Image> = new Map();
  private errors: PhaserRuntimeError[] = [];
  private errorReporter: PhaserRuntimeErrorReporter = consolePhaserRuntimeErrorReporter;
  private failedAssetKeys = new Set<string>();
  private _initialized = false;

  constructor(config?: string | any, reporter?: PhaserRuntimeErrorReporter) {
    super(isSceneOptions(config) ? config.key || 'clawgame-preview' : config || 'clawgame-preview');
    this.errorReporter = reporter ?? (isSceneOptions(config) ? config.reporter ?? this.errorReporter : this.errorReporter);
  }

  setBootstrap(bootstrap: PhaserPreviewBootstrap, reporter?: PhaserRuntimeErrorReporter): void {
    this.bootstrap = bootstrap;
    if (reporter) {
      this.errorReporter = reporter;
    }
  }

  preload(): void {
    if (!this.bootstrap) return;
    this.failedAssetKeys.clear();
    this.load?.on?.('loaderror', (file: { key?: string; url?: string; type?: string; src?: string }) => {
      const key = typeof file?.key === 'string' ? file.key : 'unknown';
      this.failedAssetKeys.add(key);
      const asset = this.bootstrap?.assets.find((candidate) => candidate.key === key);
      this.recordError('asset-load', new Error(`Failed to load asset "${key}"`), {
        key,
        url: file?.url ?? file?.src ?? asset?.loadUrl,
        type: file?.type ?? asset?.kind,
        assetRef: asset?.assetRef,
      });
    });

    for (const asset of this.bootstrap.assets) {
      try {
        if (asset.atlasMeta) {
          const loader = this.load as Phaser.Loader.LoaderPlugin & {
            atlasXML?: (
              key: string,
              textureURL?: string | string[],
              atlasURL?: string,
            ) => Phaser.Loader.LoaderPlugin;
          };
          if (asset.atlasMeta.type === 'xml' && loader.atlasXML) {
            loader.atlasXML(asset.key, asset.loadUrl, asset.atlasMeta.atlasUrl);
          } else {
            loader.atlas(asset.key, asset.loadUrl, asset.atlasMeta.atlasUrl);
          }
        } else if (asset.frameData) {
          this.load.spritesheet(asset.key, asset.loadUrl, asset.frameData);
        } else {
          this.load.image(asset.key, asset.loadUrl);
        }
      } catch (error) {
        this.failedAssetKeys.add(asset.key);
        this.recordError('preload', error, {
          key: asset.key,
          assetRef: asset.assetRef,
          loadUrl: asset.loadUrl,
          kind: asset.kind,
        });
      }
    }
  }

  create(): void {
    if (!this.bootstrap) return;
    try {
      this.cameras?.main?.setBackgroundColor(this.bootstrap.backgroundColor || '#1a1a2e');
      const camera = this.bootstrap.camera;
      if (camera?.bounds) {
        this.cameras?.main?.setBounds(camera.bounds.x, camera.bounds.y, camera.bounds.width, camera.bounds.height);
      }
      if (typeof camera?.scrollX === 'number' || typeof camera?.scrollY === 'number') {
        this.cameras?.main?.setScroll(camera.scrollX ?? 0, camera.scrollY ?? 0);
      }
      if (typeof camera?.zoom === 'number') {
        this.cameras?.main?.setZoom(camera.zoom);
      }
    } catch (error) {
      this.recordError('create', error, { operation: 'camera-config' });
    }

    const bounds = this.bootstrap.bounds || { width: 800, height: 600 };
    try {
      this.physics?.world?.setBounds(bounds.x ?? 0, bounds.y ?? 0, bounds.width, bounds.height);
      if (this.bootstrap.physics?.gravity && this.physics?.world?.gravity) {
        this.physics.world.gravity.x = this.bootstrap.physics.gravity.x;
        this.physics.world.gravity.y = this.bootstrap.physics.gravity.y;
      }
    } catch (error) {
      this.recordError('create', error, { operation: 'physics-config' });
    }

    for (const asset of this.bootstrap.assets) {
      if (this.failedAssetKeys.has(asset.key)) {
        this.createFallbackTexture(asset);
      }
    }

    for (const entity of this.bootstrap.entities) {
      try {
        this.createEntity(entity);
      } catch (error) {
        this.recordError('entity-creation', error, { entityId: entity.id, entityType: entity.type });
      }
    }
    this._initialized = true;
  }

  init(_data?: any): void {
    // Optional — override in subclasses to receive bootstrap data
  }

  update(_time: number, _delta: number): void {
    // Override in subclasses for game logic
  }

  protected createEntity(entity: PhaserPreviewEntity): void {
    if (!this.add) return;
    let obj: GameObjects.Rectangle | GameObjects.Image;
    if (entity.assetKey) {
      obj = this.add.image(entity.x, entity.y, entity.assetKey);
      (obj as GameObjects.Image).setDisplaySize(entity.width, entity.height);
    } else {
      const color = this.getColorForType(entity.type);
      obj = this.add.rectangle(entity.x, entity.y, entity.width, entity.height, color);
    }
    obj.setRotation(entity.rotation || 0);
    obj.setScale(entity.scaleX || 1, entity.scaleY || 1);
    obj.setOrigin(0.5, 0.5);

    if (entity.body.kind !== 'none' && this.physics) {
      this.physics.add.existing(obj, entity.body.kind === 'static');
      const body = (obj as any).body as Phaser.Physics.Arcade.Body | undefined;
      if (body) {
        body.setSize(entity.body.width, entity.body.height);
        if (entity.body.kind === 'dynamic') body.setCollideWorldBounds(true);
        if (entity.body.kind === 'sensor') { body.setImmovable(true); body.setAllowGravity(false); }
      }
    }

    this.entitySprites.set(entity.id, obj);
  }

  protected recordError(phase: string, error: unknown, context?: Record<string, unknown>): void {
    const runtimeError: PhaserRuntimeError = { phase, error, ...(context ? { context } : {}) };
    this.errors.push(runtimeError);
    this.errorReporter.reportError(phase, error, context);
  }

  private createFallbackTexture(asset: PhaserPreviewAsset): void {
    try {
      if (this.textures?.exists?.(asset.key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x888888, 1);
      graphics.fillRect(0, 0, asset.width, asset.height);
      graphics.lineStyle(2, 0xff3366, 1);
      graphics.strokeRect(0, 0, asset.width, asset.height);
      graphics.generateTexture(asset.key, asset.width, asset.height);
      graphics.destroy();
    } catch (error) {
      this.recordError('create', error, { operation: 'fallback-texture', key: asset.key });
    }
  }

  protected getColorForType(type: string): number {
    const colors: Record<string, number> = {
      player: 0x3b82f6, enemy: 0xef4444, collectible: 0xf59e0b,
      obstacle: 0x64748b, npc: 0x22c55e, tower: 0xd2691e,
      projectile: 0xffff00, core: 0x22c55e,
    };
    return colors[type] || 0x8b5cf6;
  }

  getEntity(id: string): GameObjects.GameObject | undefined { return this.entitySprites.get(id); }
  getEntities(): Map<string, GameObjects.Rectangle | GameObjects.Image> { return this.entitySprites; }
  getErrors(): PhaserRuntimeError[] { return [...this.errors]; }
  get isReady(): boolean { return this._initialized; }
}
