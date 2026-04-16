import { Scene, GameObjects } from 'phaser';
import type { PhaserPreviewBootstrap, PhaserPreviewEntity } from './types';

/**
 * ClawgamePhaserScene — base preview scene extending Phaser Scene.
 * Renders canonical entities as color-coded shapes.
 */
export class ClawgamePhaserScene extends Scene {
  protected bootstrap: PhaserPreviewBootstrap | null = null;
  private entitySprites: Map<string, GameObjects.Rectangle | GameObjects.Image> = new Map();
  private _initialized = false;

  constructor(config?: string | any) {
    super(config || 'clawgame-preview');
  }

  setBootstrap(bootstrap: PhaserPreviewBootstrap): void {
    this.bootstrap = bootstrap;
  }

  preload(): void {
    if (!this.bootstrap) return;
    for (const asset of this.bootstrap.assets) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x888888, 1);
      g.fillRect(0, 0, asset.width, asset.height);
      g.generateTexture(asset.key, asset.width, asset.height);
      g.destroy();
    }
  }

  create(): void {
    if (!this.bootstrap) return;
    try {
      this.cameras?.main?.setBackgroundColor(this.bootstrap.backgroundColor || '#1a1a2e');
    } catch {}
    const bounds = this.bootstrap.bounds || { width: 800, height: 600 };
    try {
      this.physics?.world?.setBounds(0, 0, bounds.width, bounds.height);
    } catch {}
    for (const entity of this.bootstrap.entities) {
      try { this.createEntity(entity); } catch {}
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
  get isReady(): boolean { return this._initialized; }
}
