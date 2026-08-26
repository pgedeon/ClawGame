import { Scene, GameObjects, Input } from 'phaser';
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
  /**
   * Enable generic gameplay wiring: arcade colliders between static and dynamic
   * bodies, keyboard control for playerInput entities (platformer run+jump when
   * `movement.jumpSpeed` is present, 4-directional otherwise), and a chase
   * driver for entities with `ai.targetEntity` + speed. Off by default so the
   * dedicated genre scenes keep their hand-tuned behavior.
   */
  gameplay?: boolean;
}

function isSceneOptions(value: unknown): value is ClawgamePhaserSceneOptions {
  return !!value && typeof value === 'object' && ('reporter' in value || 'key' in value || 'gameplay' in value);
}

/** Minimal structural key type — real Phaser Key objects only expose isDown here. */
interface KeyLike {
  isDown: boolean;
}

interface CursorKeysLike {
  left: KeyLike;
  right: KeyLike;
  up: KeyLike;
  down: KeyLike;
}

interface ArcadeBodyLike {
  setVelocity?: (x: number, y: number) => unknown;
  setVelocityX?: (x: number) => unknown;
  setVelocityY?: (y: number) => unknown;
  onFloor?: () => boolean;
  blocked?: { down?: boolean };
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
  private gameplayEnabled = false;
  protected gameplayCursors: CursorKeysLike | null = null;
  protected gameplayKeys: Partial<Record<'w' | 'a' | 's' | 'd' | 'space', KeyLike>> = {};
  protected gameplayPlayerEntityId: string | null = null;

  constructor(config?: string | any, reporter?: PhaserRuntimeErrorReporter) {
    super(isSceneOptions(config) ? config.key || 'clawgame-preview' : config || 'clawgame-preview');
    this.errorReporter = reporter ?? (isSceneOptions(config) ? config.reporter ?? this.errorReporter : this.errorReporter);
    if (isSceneOptions(config) && config.gameplay === true) {
      this.gameplayEnabled = true;
    }
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
    if (this.gameplayEnabled) {
      this.setupGameplay();
    }
  }

  init(_data?: any): void {
    // Optional — override in subclasses to receive bootstrap data
  }

  update(_time: number, _delta: number): void {
    if (!this.gameplayEnabled || !this.bootstrap || !this._initialized) return;
    try {
      this.updatePlayerControl();
      this.updateChaseDrivers();
    } catch (error) {
      // Fail safe: a broken gameplay loop must not spam errors every frame.
      // Disable it and surface one visible error instead.
      this.gameplayEnabled = false;
      this.recordError('gameplay-update', error, {});
    }
  }

  /**
   * Generic gameplay wiring for bootstrap-driven scenes without a dedicated
   * genre implementation. Static platforms/walls collide with dynamic bodies
   * (player, chase enemies); arrow keys/WASD drive playerInput entities;
   * entities with ai.targetEntity chase their target at ai.speed.
   */
  protected setupGameplay(): void {
    try {
      const staticObjects: GameObjects.GameObject[] = [];
      const dynamicObjects: GameObjects.GameObject[] = [];
      for (const entity of this.bootstrap?.entities ?? []) {
        const sprite = this.entitySprites.get(entity.id);
        if (!sprite) continue;
        if (entity.body.kind === 'static') staticObjects.push(sprite);
        else if (entity.body.kind === 'dynamic') dynamicObjects.push(sprite);
      }
      if (staticObjects.length > 0 && dynamicObjects.length > 0 && this.physics?.add?.collider) {
        this.physics.add.collider(staticObjects, dynamicObjects);
      }

      const keyboard = this.input?.keyboard;
      if (keyboard) {
        this.gameplayCursors = keyboard.createCursorKeys() as unknown as CursorKeysLike;
        const keyCodes = Input.Keyboard.KeyCodes;
        this.gameplayKeys = {
          w: keyboard.addKey(keyCodes.W) as unknown as KeyLike,
          a: keyboard.addKey(keyCodes.A) as unknown as KeyLike,
          s: keyboard.addKey(keyCodes.S) as unknown as KeyLike,
          d: keyboard.addKey(keyCodes.D) as unknown as KeyLike,
          space: keyboard.addKey(keyCodes.SPACE) as unknown as KeyLike,
        };
      }

      const entities = this.bootstrap?.entities ?? [];
      this.gameplayPlayerEntityId = (
        entities.find((entity) => entity.playerInput)
        ?? entities.find((entity) => entity.type === 'player')
        ?? null
      )?.id ?? null;
    } catch (error) {
      this.gameplayEnabled = false;
      this.recordError('gameplay-setup', error, {});
    }
  }

  private getBody(entityId: string | null): { sprite: GameObjects.Rectangle | GameObjects.Image; body: ArcadeBodyLike } | null {
    if (!entityId) return null;
    const sprite = this.entitySprites.get(entityId);
    const body = sprite ? ((sprite as unknown as { body?: ArcadeBodyLike }).body ?? null) : null;
    if (!sprite || !body || typeof body.setVelocity !== 'function') return null;
    return { sprite, body };
  }

  private updatePlayerControl(): void {
    const controlled = this.getBody(this.gameplayPlayerEntityId);
    if (!controlled) return;
    const entity = this.bootstrap?.entities.find((candidate) => candidate.id === this.gameplayPlayerEntityId);
    if (!entity) return;

    const left = this.gameplayCursors?.left?.isDown === true || this.gameplayKeys.a?.isDown === true;
    const right = this.gameplayCursors?.right?.isDown === true || this.gameplayKeys.d?.isDown === true;
    const up = this.gameplayCursors?.up?.isDown === true || this.gameplayKeys.w?.isDown === true;
    const down = this.gameplayCursors?.down?.isDown === true || this.gameplayKeys.s?.isDown === true;
    const jumpSpeed = entity.movement?.jumpSpeed;
    const speed = typeof entity.movement?.speed === 'number' ? entity.movement.speed : 200;

    if (typeof jumpSpeed === 'number') {
      // Platformer-style: horizontal run + floor-relative jump ("Space to jump").
      const direction = (right ? 1 : 0) - (left ? 1 : 0);
      controlled.body.setVelocityX?.(direction * speed);
      const jumpHeld = this.gameplayKeys.space?.isDown === true || up || this.gameplayKeys.w?.isDown === true;
      const grounded = typeof controlled.body.onFloor === 'function'
        ? controlled.body.onFloor()
        : controlled.body.blocked?.down === true;
      if (jumpHeld && grounded) {
        controlled.body.setVelocityY?.(-jumpSpeed);
      }
    } else {
      // Top-down style: direct 4-directional velocity, normalized diagonals.
      let vx = (right ? 1 : 0) - (left ? 1 : 0);
      let vy = (down ? 1 : 0) - (up ? 1 : 0);
      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
      controlled.body.setVelocity?.(vx * speed, vy * speed);
    }
  }

  private updateChaseDrivers(): void {
    for (const entity of this.bootstrap?.entities ?? []) {
      const targetEntityId = entity.ai?.targetEntity;
      if (!targetEntityId || entity.id === this.gameplayPlayerEntityId) continue;
      const chaser = this.getBody(entity.id);
      const target = this.getBody(targetEntityId);
      if (!chaser || !target) continue;

      const dx = target.sprite.x - chaser.sprite.x;
      const dy = target.sprite.y - chaser.sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1) continue; // Already on top of the target.

      const speed = entity.ai?.speed ?? entity.movement?.speed ?? 80;
      chaser.body.setVelocity?.((dx / distance) * speed, (dy / distance) * speed);
    }
  }

  /**
   * Parse a CSS hex color ('#rgb' | '#rrggbb') into a Phaser tint/fill number.
   * Returns null for anything else so callers can fall back to type colors.
   */
  private parseTintColor(value: string): number | null {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
    if (!match) return null;
    const hex = match[1];
    const expanded = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;
    return parseInt(expanded, 16);
  }

  protected createEntity(entity: PhaserPreviewEntity): void {
    if (!this.add) return;
    // Per-entity sprite.color (carried as bootstrap `tint`) overrides the
    // hardcoded type-color map — template recolors must display at Play.
    const tintColor = typeof entity.tint === 'string' ? this.parseTintColor(entity.tint) : null;
    let obj: GameObjects.Rectangle | GameObjects.Image;
    if (entity.assetKey) {
      obj = this.add.image(entity.x, entity.y, entity.assetKey);
      (obj as GameObjects.Image).setDisplaySize(entity.width, entity.height);
      if (tintColor !== null) {
        // Capability-checked setTint (Phaser-4-safe): skip silently-shaped mocks
        // and engine builds without the Tint component rather than throwing.
        const tappable = obj as unknown as { setTint?: (tint: number) => unknown };
        if (typeof tappable.setTint === 'function') {
          tappable.setTint(tintColor);
        }
      }
    } else {
      const color = tintColor ?? this.getColorForType(entity.type);
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
