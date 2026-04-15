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
  private assetCache = new Map<string, HTMLImageElement>();
  private draggingEntity: string | null = null;
  private dragOffset = { x: 0, y: 0 };

  // Editor state (set from React)
  public showGrid = true;
  public gridSize = 32;
  public snapping = true;
  public selectedEntityId: string | null = null;
  public viewportZoom = 1;
  public showPhysicsDebug = false;

  // Callbacks to React
  public onEntityMoved?: (entityId: string, x: number, y: number) => void;
  public onEntitySelected?: (entityId: string | null) => void;
  public onViewportChanged?: (x: number, y: number, zoom: number) => void;

  constructor() {
    super({ key: 'clawgame-scene-editor' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#09111f');
    this.gridGraphics = this.add.graphics().setDepth(0);
    this.overlayGraphics = this.add.graphics().setDepth(1000);
    this.setupCameraControls();
    this.setupInputHandlers();
    this.drawGrid();
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
    const color = sprite?.color || this.defaultColor(entity.type);
    const rotation = (entity.transform.rotation || 0) * (180 / Math.PI);

    if (existing) {
      existing.container.setPosition(entity.transform.x, entity.transform.y);
      existing.container.setScale(entity.transform.scaleX || 1, entity.transform.scaleY || 1);
      existing.container.setAngle(rotation);
      existing.label.setPosition(width / 2, -height / 2 - 16);
      existing.label.setText(entity.type || entity.id);
      return;
    }

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
      const rect = this.add.rectangle(0, 0, width, height, this.hexToInt(color));
      rect.setOrigin(0, 0);
      rect.setStrokeStyle(2, 0xffffff, 0.15);
      renderObj = rect;
    }

    const label = this.add.text(width / 2, -height / 2 - 16, entity.type || entity.id, {
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
    const rect = this.add.rectangle(0, 0, template.width, template.height, this.hexToInt(template.color), 0.4);
    rect.setOrigin(0, 0);
    rect.setStrokeStyle(2, 0xffffff, 0.4);
    this.ghostObject.add(rect);
    this.ghostObject.setDepth(500);
  }

  /* ─── Camera controls ─── */

  private setupCameraControls(): void {
    const cam = this.cameras.main;

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && (pointer.rightButtonDown() || (pointer.event as MouseEvent).altKey)) {
        cam.setScroll(
          cam.scrollX - (pointer.x - pointer.prevPosition.x) / cam.zoom,
          cam.scrollY - (pointer.y - pointer.prevPosition.y) / cam.zoom,
        );
        this.onViewportChanged?.(cam.scrollX, cam.scrollY, cam.zoom);
        this.drawGrid();
      }
      if (this.ghostObject) {
        const wp = cam.getWorldPoint(pointer.x, pointer.y);
        this.moveGhost(wp.x, wp.y);
      }
    });

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _g: any[], _dx: number, dy: number) => {
      const newZoom = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.1, 5);
      cam.setZoom(newZoom);
      this.viewportZoom = newZoom;
      this.onViewportChanged?.(cam.scrollX, cam.scrollY, newZoom);
      this.drawGrid();
    });
  }

  /* ─── Input handlers ─── */

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      let clicked: string | null = null;
      const entries = [...this.entityMap.entries()].reverse();
      for (const [id, render] of entries) {
        if (render.container.getBounds().contains(wp.x, wp.y)) {
          clicked = id;
          break;
        }
      }

      this.selectedEntityId = clicked;
      this.onEntitySelected?.(clicked);

      if (clicked) {
        this.draggingEntity = clicked;
        const r = this.entityMap.get(clicked)!;
        this.dragOffset = { x: wp.x - r.container.x, y: wp.y - r.container.y };
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || pointer.rightButtonDown() || (pointer.event as MouseEvent).altKey) return;
      if (!this.draggingEntity) return;

      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      let x = wp.x - this.dragOffset.x;
      let y = wp.y - this.dragOffset.y;
      if (this.snapping) {
        x = Math.round(x / this.gridSize) * this.gridSize;
        y = Math.round(y / this.gridSize) * this.gridSize;
      }
      const r = this.entityMap.get(this.draggingEntity);
      if (r) {
        r.container.setPosition(x, y);
        this.onEntityMoved?.(this.draggingEntity, x, y);
      }
    });

    this.input.on('pointerup', () => { this.draggingEntity = null; });
  }

  private moveGhost(wx: number, wy: number): void {
    if (!this.ghostObject) return;
    const x = this.snapping ? Math.round(wx / this.gridSize) * this.gridSize : wx;
    const y = this.snapping ? Math.round(wy / this.gridSize) * this.gridSize : wy;
    this.ghostObject.setPosition(x, y);
  }

  /* ─── Drawing ─── */

  public drawGrid(): void {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
    if (!this.showGrid) return;

    const cam = this.cameras.main;
    const g = this.gridSize;
    const vl = cam.scrollX - cam.width / 2 / cam.zoom;
    const vt = cam.scrollY - cam.height / 2 / cam.zoom;
    const vr = cam.scrollX + cam.width / 2 / cam.zoom;
    const vb = cam.scrollY + cam.height / 2 / cam.zoom;

    this.gridGraphics.lineStyle(1, 0x475569, 0.3);
    const sx = Math.floor(vl / g) * g;
    const sy = Math.floor(vt / g) * g;
    for (let x = sx; x <= vr; x += g) this.gridGraphics.lineBetween(x, vt, x, vb);
    for (let y = sy; y <= vb; y += g) this.gridGraphics.lineBetween(vl, y, vr, y);

    this.gridGraphics.lineStyle(2, 0x60a5fa, 0.4);
    this.gridGraphics.lineBetween(-100, 0, 100, 0);
    this.gridGraphics.lineBetween(0, -100, 0, 100);
  }

  private drawSelectionOverlay(): void {
    if (!this.overlayGraphics) return;
    this.overlayGraphics.clear();
    if (!this.selectedEntityId) return;
    const r = this.entityMap.get(this.selectedEntityId);
    if (!r) return;

    const b = r.container.getBounds();
    this.overlayGraphics.lineStyle(2.5, 0x60a5fa, 0.9);
    this.overlayGraphics.strokeRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8);

    const hs = 6;
    this.overlayGraphics.fillStyle(0x3b82f6, 1);
    this.overlayGraphics.fillRect(b.x - hs / 2, b.y - hs / 2, hs, hs);
    this.overlayGraphics.fillRect(b.x + b.width - hs / 2, b.y - hs / 2, hs, hs);
    this.overlayGraphics.fillRect(b.x - hs / 2, b.y + b.height - hs / 2, hs, hs);
    this.overlayGraphics.fillRect(b.x + b.width - hs / 2, b.y + b.height - hs / 2, hs, hs);
  }

  /* ─── Utilities ─── */

  private defaultColor(type?: string): string {
    const m: Record<string, string> = {
      player: '#3b82f6', enemy: '#ef4444', collectible: '#f59e0b',
      obstacle: '#64748b', npc: '#22c55e', platform: '#475569', custom: '#8b5cf6',
    };
    return m[type || ''] || '#8b5cf6';
  }

  private hexToInt(hex: string): number {
    if (!hex || !hex.startsWith('#')) return 0x8b5cf6;
    return parseInt(hex.replace('#', ''), 16);
  }
}
