import * as Phaser from 'phaser';
import type {
  Entity,
  SpriteComponent as Sprite,
  CollisionComponent as Collision,
} from '@clawgame/engine';

export interface EditorEntityRender {
  phaserId: string;
  gameObject: Phaser.GameObjects.GameObject;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  body?: Phaser.Physics.Arcade.Body;
}

export class PhaserSceneEditor extends Phaser.Scene {
  private entityMap = new Map<string, EditorEntityRender>();
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private ghostObject: Phaser.GameObjects.Container | null = null;
  private selectedEntityId: string | null = null;
  private assetCache = new Map<string, HTMLImageElement>();
  private viewportZoom = 1;
  
  // Public API for React integration
  public onEntitySelected: (id: string) => void = () => {};
  public onEntityMoved: (entityId: string, x: number, y: number) => void = () => {};
  public onViewportChanged: () => void = () => {};
  public showGrid = true;
  public gridSize = 32;
  public snapping = true;

  private readonly colors: Record<string, number> = {
    player: 0x4ade80,
    enemy: 0xf87171,
    obstacle: 0x9ca3af,
    platform: 0x6366f1,
    projectile: 0xfbbf24,
    collectible: 0xa78bfa,
    trigger: 0x22d3ee,
    unknown: 0xffffff,
  };

  constructor() {
    super('PhaserSceneEditor');
  }

  preload(): void {
    // Preload is handled externally via asset cache
  }

  create(): void {
    this.drawGrid();
    // Use events property from Phaser Scene
    if ('events' in this) {
      (this as any).events.on('update', this.update, this);
    }
  }

  update(): void {
    this.drawSelectionOverlay();
  }

  /* ─── Entity sync ─── */

  syncEntities(entities: Entity[], cache: Map<string, HTMLImageElement>): void {
    this.assetCache = cache;
    const activeIds = new Set(entities.map(e => e.id));
    for (const [id] of this.entityMap) {
      if (!activeIds.has(id)) this.removeEntity(id);
    }
    for (const entity of entities) {
      this.syncEntity(entity);
    }
  }

  private syncEntity(entity: Entity): void {
    const existing = this.entityMap.get(entity.id);
    const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
    const sprite = comps.get('sprite') as Sprite | undefined;
    const collision = comps.get('collision') as Collision | undefined;
    const width = sprite?.width || collision?.width || 32;
    const height = sprite?.height || collision?.height || 32;
    const color = this.parseColor(sprite?.color, entity.type);
    const rotation = (entity.transform.rotation || 0) * (180 / Math.PI);

    // Check if existing render is valid
    const existingValid = existing && existing.container && existing.label;
    
    if (existingValid) {
      existing.container.setPosition(entity.transform.x, entity.transform.y);
      existing.container.setScale(entity.transform.scaleX || 1, entity.transform.scaleY || 1);
      existing.container.setAngle(rotation);
      existing.label.setPosition(width / 2, -height / 2 - 16);
      existing.label.setText(entity.type || String(entity.id));
      return;
    }

    // If existing is corrupted, remove it first
    if (existing) {
      this.entityMap.delete(entity.id);
    }

    // Create new entity
    const container = this.add.container(entity.transform.x, entity.transform.y);
    container.setDepth(10);
    container.setAngle(rotation);
    container.setScale(entity.transform.scaleX || 1, entity.transform.scaleY || 1);

    let renderObj: Phaser.GameObjects.GameObject;
    const assetRef = (sprite as any)?.assetRef ?? (sprite as any)?.image;
    if (assetRef && this.assetCache.has(String(assetRef))) {
      const texKey = `editor-asset:${assetRef}`;
      if (!this.textures.exists(texKey)) {
        this.textures.addImage(texKey, this.assetCache.get(String(assetRef))! as any);
      }
      const img = this.add.image(0, 0, texKey);
      img.setDisplaySize(width, height);
      img.setOrigin(0, 0);
      renderObj = img;
    } else {
      const rect = this.add.rectangle(0, 0, width, height, color);
      rect.setOrigin(0, 0);
      rect.setStrokeStyle(2, 0xffffff, 0.15);
      renderObj = rect;
    }

    const label = this.add.text(width / 2, -height / 2 - 16, entity.type || String(entity.id), {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: 'rgba(15,23,42,0.9)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0.5);

    container.add([renderObj, label]);

    if (collision && collision.type) {
      const isStatic = collision.type === 'wall' || collision.type === 'solid';
      this.physics.add.existing(container, isStatic);
      const body = container.body as Phaser.Physics.Arcade.Body;
      body.setSize(width, height);
      body.setAllowGravity(false);
      body.setImmovable(isStatic);
    }

    this.entityMap.set(entity.id, {
      phaserId: entity.id,
      gameObject: renderObj,
      container,
      label,
    });
  }

  private removeEntity(id: string): void {
    const r = this.entityMap.get(id);
    if (r) { r.container.destroy(true); this.entityMap.delete(id); }
  }

  setSelectedEntity(entityId: string | null): void {
    this.selectedEntityId = entityId;
  }

  setViewport(x: number, y: number, zoom: number): void {
    this.cameras.main.setScroll(x, y);
    this.cameras.main.setZoom(zoom);
    this.viewportZoom = zoom;
    this.drawGrid();
  }

  public showGhostEntity(template: { type: string; width: number; height: number; color: string } | null): void {
    if (this.ghostObject) { this.ghostObject.destroy(); this.ghostObject = null; }
    if (!template) return;
    this.ghostObject = this.add.container(0, 0);
    const rect = this.add.rectangle(0, 0, template.width, template.height, this.parseColor(template.color, template.type), 0.4);
    rect.setOrigin(0, 0);
    rect.setStrokeStyle(2, 0xffffff, 0.4);
    this.ghostObject.add(rect);
  }

  public updateGhostPosition(x: number, y: number): void {
    if (this.ghostObject) { this.ghostObject.setPosition(x, y); }
  }

  public drawGrid(): void {
    if (!this.gridGraphics) {
      this.gridGraphics = this.add.graphics();
    }
    const gw = this.scale.width;
    const gh = this.scale.height;
    const gridSize = this.gridSize * this.viewportZoom;
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x1e293b, 1);
    for (let x = 0; x < gw; x += gridSize) {
      this.gridGraphics.moveTo(x, 0).lineTo(x, gh);
    }
    for (let y = 0; y < gh; y += gridSize) {
      this.gridGraphics.moveTo(0, y).lineTo(gw, y);
    }
    this.gridGraphics.strokePath();
  }

  private drawSelectionOverlay(): void {
    if (!this.overlayGraphics) {
      this.overlayGraphics = this.add.graphics();
    }
    this.overlayGraphics.clear();
    if (!this.selectedEntityId) return;
    const render = this.entityMap.get(this.selectedEntityId);
    if (!render) return;
    this.overlayGraphics.lineStyle(2, 0xfacc15, 1);
    const bounds = render.container.getBounds();
    this.overlayGraphics.strokeRect(
      bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4
    );
  }

  private defaultColor(type: string | undefined): number {
    if (!type) return this.colors.unknown;
    return this.colors[type] ?? this.colors.unknown;
  }

  private parseColor(color: string | number | undefined, fallbackType?: string | undefined): number {
    if (typeof color === 'number') {
      return color;
    }
    if (!color) {
      return this.defaultColor(fallbackType);
    }
    if (typeof color === 'string') {
      if (color.startsWith('#')) {
        return parseInt(color.slice(1), 16);
      }
      return parseInt(color, 16);
    }
    return this.defaultColor(fallbackType);
  }
}
