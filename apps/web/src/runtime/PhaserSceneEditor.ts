import * as Phaser from 'phaser';
import type {
  Entity,
  SpriteComponent as Sprite,
  CollisionComponent as Collision,
  AnimationComponent as Animation,
} from '@clawgame/engine';
import {
  calculateDragPosition,
  calculateKeyboardNudge,
  createCollisionSignature,
  hitTestEntityBounds,
  shouldReplaceEntityVisual,
  type EditorRenderKind,
  type ViewportState,
} from './PhaserSceneEditorGeometry';

export interface EditorEntityRender {
  phaserId: string;
  gameObject: Phaser.GameObjects.GameObject;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  body?: Phaser.Physics.Arcade.Body;
  width: number;
  height: number;
  color: number;
  assetRef: string | null;
  renderKind: EditorRenderKind;
  collisionSignature: string | null;
  locked: boolean;
  collisionData: any;
}

export class PhaserSceneEditor extends Phaser.Scene {
  private entityMap = new Map<string, EditorEntityRender>();
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private ghostObject: Phaser.GameObjects.Container | null = null;
  private selectedEntityId: string | null = null;
  private assetCache = new Map<string, HTMLImageElement>();
  private viewportZoom = 1;
  private isReady = false;
  private dragState: { entityId: string; offsetX: number; offsetY: number } | null = null;
  private panState: { lastX: number; lastY: number } | null = null;
  private isSpacePanActive = false;
  
  // Public API for React integration
  public onEntitySelected: (id: string | null) => void = () => {};
  public onEntityMoved: (entityId: string, x: number, y: number) => void = () => {};
  public onEntityDeleted: (entityId: string) => void = () => {};
  public onEntityDuplicated: (entityId: string) => void = () => {};
  public onViewportChanged: (viewport: ViewportState) => void = () => {};
  public showGrid = true;
  public showPhysicsDebug = false;
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
    this.isReady = true;
    this.drawGrid();
    this.installInputHandlers();
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
    if (!this.isReady || !this.add) return; // Guard against Scene not being initialized
    this.assetCache = cache;
    const activeIds = new Set(entities.map(e => e.id));
    for (const [id] of this.entityMap) {
      if (!activeIds.has(id)) this.removeEntity(id);
    }
    for (const entity of entities) {
      this.syncEntity(entity);
    }
    this.drawCollisionOverlays();
  }

  private syncEntity(entity: Entity): void {
    if (!this.isReady || !this.add) return; // Guard against Scene not being initialized

    try {
      this.syncEntityUnsafe(entity);
    } catch (error) {
      this.removeEntity(entity.id);
      console.error(`Failed to sync editor entity "${entity.id}"`, error);
    }
  }

  private removeEntity(id: string): void {
    const r = this.entityMap.get(id);
    if (r) {
      this.disablePhysicsBody(r);
      r.container.destroy(true);
      this.entityMap.delete(id);
    }
  }

  setSelectedEntity(entityId: string | null): void {
    this.selectedEntityId = entityId;
  }

  setViewport(x: number, y: number, zoom: number): void {
    if (!this.isReady || !this.cameras.main) return;
    this.cameras.main.setScroll(x, y);
    this.cameras.main.setZoom(zoom);
    this.viewportZoom = zoom;
    this.drawGrid();
  }

  public showGhostEntity(template: { type: string; width: number; height: number; color: string } | null): void {
    if (!this.isReady || !this.add) return;
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

  public resetView(): void {
    this.setViewport(0, 0, 1);
    this.emitViewportChanged();
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const canvas = this.game?.canvas;
    const rect = canvas?.getBoundingClientRect();
    const localX = rect ? screenX - rect.left : screenX;
    const localY = rect ? screenY - rect.top : screenY;
    const point = this.cameras.main.getWorldPoint(localX, localY);
    return { x: point.x, y: point.y };
  }

  public drawGrid(): void {
    if (!this.isReady || !this.add || !this.cameras.main) return;
    if (!this.gridGraphics) {
      this.gridGraphics = this.add.graphics();
      this.gridGraphics.setDepth(0);
    }
    this.gridGraphics.clear();
    this.gridGraphics.setVisible(this.showGrid);
    if (!this.showGrid) return;

    const camera = this.cameras.main;
    const gridSize = Math.max(1, this.gridSize);
    const left = camera.scrollX;
    const top = camera.scrollY;
    const right = left + camera.width / camera.zoom;
    const bottom = top + camera.height / camera.zoom;
    const startX = Math.floor(left / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;

    this.gridGraphics.lineStyle(1, 0x1e293b, 1);
    for (let x = startX; x <= right; x += gridSize) {
      this.gridGraphics.moveTo(x, top).lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += gridSize) {
      this.gridGraphics.moveTo(left, y).lineTo(right, y);
    }
    this.gridGraphics.strokePath();
  }

  private drawSelectionOverlay(): void {
    if (!this.isReady || !this.add) return;
    if (!this.overlayGraphics) {
      this.overlayGraphics = this.add.graphics();
      this.overlayGraphics.setDepth(1000);
    }
    this.overlayGraphics.clear();
    if (!this.selectedEntityId) return;
    const render = this.entityMap.get(this.selectedEntityId);
    if (!render || !render.container) return;
    this.overlayGraphics.lineStyle(2, 0xfacc15, 1);
    const bounds = this.getRenderWorldBounds(render);
    this.overlayGraphics.strokeRect(
      bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4
    );
  }

  public togglePhysicsDebug(show: boolean): void {
    this.showPhysicsDebug = show;
    // Toggle Arcade Physics debug rendering
    const world = (this.physics as any)?.world;
    if (world) {
      world.debugGraphic = show ? this.add.graphics() : null;
      if (!show && world.debugGraphic) {
        world.debugGraphic.destroy();
      }
    }
  }

  private installInputHandlers(): void {
    const canvas = this.game?.canvas;
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.style.outline = 'none';
    }

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);

    this.input.keyboard?.on('keydown', this.handleKeyDown, this);
    this.input.keyboard?.on('keyup-SPACE', () => {
      this.isSpacePanActive = false;
      if (!this.panState) this.updateHoverCursor(null);
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.focusCanvas();
    const button = (pointer as any).button;

    if (button === 1 || this.isSpacePanActive) {
      this.panState = { lastX: pointer.x, lastY: pointer.y };
      this.setCursor('grabbing');
      return;
    }

    const world = this.pointerToWorld(pointer);
    const hitId = this.hitTestEntities(world.x, world.y);

    if (!hitId) {
      this.selectedEntityId = null;
      this.onEntitySelected(null);
      this.updateHoverCursor(null);
      return;
    }

    const render = this.entityMap.get(hitId);
    if (!render || render.locked) {
      this.updateHoverCursor(null);
      return;
    }

    this.selectedEntityId = hitId;
    this.onEntitySelected(hitId);
    this.dragState = {
      entityId: hitId,
      offsetX: world.x - render.container.x,
      offsetY: world.y - render.container.y,
    };
    this.setCursor('grabbing');
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.panState) {
      const camera = this.cameras.main;
      const dx = pointer.x - this.panState.lastX;
      const dy = pointer.y - this.panState.lastY;
      camera.setScroll(camera.scrollX - dx / camera.zoom, camera.scrollY - dy / camera.zoom);
      this.panState = { lastX: pointer.x, lastY: pointer.y };
      this.drawGrid();
      this.emitViewportChanged();
      return;
    }

    if (this.dragState) {
      const render = this.entityMap.get(this.dragState.entityId);
      if (!render || render.locked) return;
      const world = this.pointerToWorld(pointer);
      const position = calculateDragPosition(
        world.x,
        world.y,
        this.dragState.offsetX,
        this.dragState.offsetY,
        this.gridSize,
        this.snapping,
      );
      render.container.setPosition(position.x, position.y);
      this.drawSelectionOverlay();
      this.setCursor('grabbing');
      return;
    }

    const world = this.pointerToWorld(pointer);
    const hitId = this.hitTestEntities(world.x, world.y);
    this.updateHoverCursor(hitId);
  }

  private handlePointerUp(): void {
    if (this.dragState) {
      const render = this.entityMap.get(this.dragState.entityId);
      if (render) {
        this.onEntityMoved(this.dragState.entityId, render.container.x, render.container.y);
      }
      this.dragState = null;
    }

    this.panState = null;
    this.updateHoverCursor(null);
  }

  private handleWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    pointer.event?.preventDefault();

    const camera = this.cameras.main;
    const before = this.pointerToWorld(pointer);
    const nextZoom = Phaser.Math.Clamp(camera.zoom * (1 - deltaY / 1000), 0.1, 5);
    camera.setZoom(nextZoom);
    const after = this.pointerToWorld(pointer);
    camera.setScroll(
      camera.scrollX + before.x - after.x,
      camera.scrollY + before.y - after.y,
    );

    this.viewportZoom = nextZoom;
    this.drawGrid();
    this.drawSelectionOverlay();
    this.emitViewportChanged();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isCanvasFocused()) return;

    if (event.code === 'Space' || event.key === ' ') {
      this.isSpacePanActive = true;
      event.preventDefault();
      this.setCursor('move');
      return;
    }

    const selectedId = this.selectedEntityId;
    if (!selectedId) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.onEntityDeleted(selectedId);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.onEntityDuplicated(selectedId);
      return;
    }

    const nudge = calculateKeyboardNudge(event.key, this.gridSize, event.shiftKey);
    if (!nudge) return;

    const render = this.entityMap.get(selectedId);
    if (!render || render.locked) return;

    event.preventDefault();
    const x = render.container.x + nudge.dx;
    const y = render.container.y + nudge.dy;
    render.container.setPosition(x, y);
    this.drawSelectionOverlay();
    this.onEntityMoved(selectedId, x, y);
  }

  private syncEntityUnsafe(entity: Entity): void {
    const existing = this.entityMap.get(entity.id);
    const parts = this.getEntityRenderParts(entity);

    if (existing && (!existing.container || !existing.label)) {
      this.removeEntity(entity.id);
      this.createEntityRender(entity, parts);
      return;
    }

    if (existing) {
      this.updateEntityRender(entity, existing, parts);
      return;
    }

    this.createEntityRender(entity, parts);
  }

  private createEntityRender(entity: Entity, parts = this.getEntityRenderParts(entity)): void {
    const container = this.add.container(entity.transform.x, entity.transform.y);
    container.setDepth(10);
    container.setAngle((entity.transform.rotation || 0) * (180 / Math.PI));
    container.setScale(entity.transform.scaleX || 1, entity.transform.scaleY || 1);
    container.setVisible(parts.visible);

    const renderObj = this.createEntityGameObject(parts);
    const label = this.add.text(parts.width / 2, -parts.height / 2 - 16, this.getEntityLabel(entity, parts.locked), {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: 'rgba(15,23,42,0.9)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0.5);

    container.add([renderObj, label]);

    const render: EditorEntityRender = {
      phaserId: entity.id,
      gameObject: renderObj,
      container,
      label,
      width: parts.width,
      height: parts.height,
      color: parts.color,
      assetRef: parts.assetRef,
      renderKind: parts.renderKind,
      collisionSignature: null,
      locked: parts.locked,
      collisionData: undefined,
    };

    render.collisionData = parts.collision;
    this.syncPhysicsBody(render, parts.collision);
    this.playAnimation(render, parts.animation, parts.assetRef);
    this.entityMap.set(entity.id, render);
  }

  private updateEntityRender(entity: Entity, render: EditorEntityRender, parts = this.getEntityRenderParts(entity)): void {
    render.container.setPosition(entity.transform.x, entity.transform.y);
    render.container.setScale(entity.transform.scaleX || 1, entity.transform.scaleY || 1);
    render.container.setAngle((entity.transform.rotation || 0) * (180 / Math.PI));
    render.container.setVisible(parts.visible);
    render.locked = parts.locked;

    const visualChanged = shouldReplaceEntityVisual(render, parts);
    if (visualChanged) {
      render.container.remove(render.gameObject, true);
      render.gameObject = this.createEntityGameObject(parts);
      (render.container as any).addAt
        ? (render.container as any).addAt(render.gameObject, 0)
        : render.container.add(render.gameObject);
    } else {
      this.updateEntityGameObject(render.gameObject, parts);
    }

    render.width = parts.width;
    render.height = parts.height;
    render.color = parts.color;
    render.assetRef = parts.assetRef;
    render.renderKind = parts.renderKind;
    render.label.setPosition(parts.width / 2, -parts.height / 2 - 16);
    render.label.setText(this.getEntityLabel(entity, parts.locked));
    this.syncPhysicsBody(render, parts.collision);
  }

  private createEntityGameObject(parts: ReturnType<PhaserSceneEditor['getEntityRenderParts']>): Phaser.GameObjects.GameObject {
    if (parts.renderKind === 'image' && parts.assetRef) {
      const texKey = this.ensureAssetTexture(parts.assetRef);
      if (texKey) {
        const img = this.add.image(0, 0, texKey);
        img.setDisplaySize(parts.width, parts.height);
        img.setOrigin(0, 0);
        img.setAlpha(parts.opacity);
        img.setFlip(parts.flipX, parts.flipY);
        return img;
      }
    }

    if (parts.renderKind === 'text') {
      const text = this.add.text(0, 0, parts.textContent, {
        fontSize: `${parts.fontSize}px`,
        color: parts.textColor,
        fontFamily: parts.fontFamily,
      });
      text.setAlpha(parts.opacity);
      return text;
    }

    if (parts.renderKind === 'circle') {
      const circle = this.add.circle(parts.width / 2, parts.height / 2, Math.min(parts.width, parts.height) / 2, parts.color);
      circle.setAlpha(parts.opacity);
      circle.setStrokeStyle(2, 0xffffff, 0.15);
      return circle;
    }

    const rect = this.add.rectangle(0, 0, parts.width, parts.height, parts.color);
    rect.setOrigin(0, 0);
    rect.setAlpha(parts.opacity);
    rect.setStrokeStyle(2, 0xffffff, 0.15);
    return rect;
  }

  private updateEntityGameObject(gameObject: Phaser.GameObjects.GameObject, parts: ReturnType<PhaserSceneEditor['getEntityRenderParts']>): void {
    if (parts.renderKind === 'image') {
      const image = gameObject as Phaser.GameObjects.Image;
      if (parts.assetRef) {
        const texKey = this.ensureAssetTexture(parts.assetRef);
        if (texKey && image.texture?.key !== texKey) {
          image.setTexture(texKey);
        }
      }
      image.setDisplaySize(parts.width, parts.height);
      image.setAlpha(parts.opacity);
      image.setFlip(parts.flipX, parts.flipY);
      return;
    }

    if (parts.renderKind === 'text') {
      const text = gameObject as Phaser.GameObjects.Text;
      text.setText(parts.textContent);
      text.setStyle({
        fontSize: `${parts.fontSize}px`,
        color: parts.textColor,
        fontFamily: parts.fontFamily,
      });
      text.setAlpha(parts.opacity);
      return;
    }

    if (parts.renderKind === 'circle') {
      const circle = gameObject as Phaser.GameObjects.Arc;
      circle.setPosition(parts.width / 2, parts.height / 2);
      circle.setRadius(Math.min(parts.width, parts.height) / 2);
      circle.setFillStyle(parts.color);
      circle.setAlpha(parts.opacity);
      circle.setStrokeStyle(2, 0xffffff, 0.15);
      return;
    }

    const rect = gameObject as Phaser.GameObjects.Rectangle;
    rect.setSize(parts.width, parts.height);
    rect.setFillStyle(parts.color);
    rect.setAlpha(parts.opacity);
    rect.setStrokeStyle(2, 0xffffff, 0.15);
  }

  private getEntityRenderParts(entity: Entity) {
    const comps = entity.components instanceof Map ? entity.components : new Map(Object.entries(entity.components || {}));
    const sprite = comps.get('sprite') as Sprite | undefined;
    const collision = comps.get('collision') as Collision | undefined;
    const text = comps.get('text') as Record<string, any> | undefined;
    const width = sprite?.width || collision?.width || entity.transform.width || 32;
    const height = sprite?.height || collision?.height || entity.transform.height || 32;
    const color = this.parseColor(sprite?.color, entity.type);
    const assetRefValue = (sprite as any)?.assetRef;
    const assetRef = assetRefValue ? String(assetRefValue) : null;
    const phaserKind = (entity as any).phaserKind;
    const renderKind = this.resolveRenderKind(phaserKind, assetRef);
    const visible = entity.visible !== false;
    const locked = Boolean(entity.locked);

    return {
      width,
      height,
      color,
      assetRef,
      renderKind,
      collision,
      collisionSignature: createCollisionSignature(collision),
      visible,
      locked,
      animation: comps.get('animation') as Animation | undefined,
      opacity: sprite?.opacity ?? 1,
      flipX: Boolean(sprite?.flipX),
      flipY: Boolean(sprite?.flipY),
      textContent: String(text?.content ?? entity.name ?? entity.id),
      fontSize: Number(text?.fontSize ?? 16),
      textColor: String(text?.color ?? sprite?.color ?? '#ffffff'),
      fontFamily: String(text?.fontFamily ?? 'sans-serif'),
    };
  }

  private playAnimation(render: EditorEntityRender, anim: Animation | undefined, assetRef: string | null): void {
    if (!anim || !anim.frames || anim.frames.length < 2) return;
    const sprite = render.gameObject as Phaser.GameObjects.Sprite;
    if (!sprite?.anims) return;
    const key = `anim-${render.phaserId}`;
    // Create animation if not exists
    if (!this.anims.exists(key)) {
      const frames = anim.frames.map((f) => ({ key: f }));
      this.anims.create({
        key,
        frames: frames.length > 0 ? frames : [{ key: assetRef || '__DEFAULT' }],
        frameRate: anim.frameRate || 12,
        repeat: anim.loop ? -1 : 0,
      });
    }
    if (anim.active !== false) {
      sprite.play(key);
    }
  }

  private resolveRenderKind(phaserKind: unknown, assetRef: string | null): EditorRenderKind {
    if (phaserKind === 'text') return 'text';
    if (phaserKind === 'circle') return 'circle';
    if (phaserKind === 'zone') return 'zone';
    if ((phaserKind === 'image' || phaserKind === 'sprite') && assetRef && this.assetCache.has(assetRef)) {
      return 'image';
    }
    if (assetRef && this.assetCache.has(assetRef)) return 'image';
    return 'rectangle';
  }

  private syncPhysicsBody(render: EditorEntityRender, collision: Collision | undefined): void {
    const signature = createCollisionSignature(collision);
    if (render.collisionSignature === signature) return;

    this.disablePhysicsBody(render);
    render.collisionSignature = signature;

    if (!collision || !collision.type || collision.type === 'none' || !(this.physics as any)?.add) return;

    const isStatic = collision.type === 'wall' || collision.type === 'solid';
    this.physics.add.existing(render.container, isStatic);
    const body = render.container.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    body.setSize(collision.width || render.width, collision.height || render.height);
    body.setOffset((collision as any).offsetX || 0, (collision as any).offsetY || 0);
    body.setAllowGravity(Boolean((collision as any).allowGravity));
    body.setImmovable((collision as any).immovable ?? isStatic);
    body.setBounce((collision as any).bounce ?? 0);
    body.setDrag((collision as any).drag ?? 0);
    render.body = body;
  }

  private disablePhysicsBody(render: EditorEntityRender): void {
    // Only disable if the body actually exists
    if (render.container.body != null && (this.physics as any)?.world?.disable) {
      (this.physics as any).world.disable(render.container);
    }
    render.body = undefined;
  }

  /** Draw collision body overlays for all entities with collision components */
  public drawCollisionOverlays(): void {
    if (!this.collisionOverlayGraphics) {
      this.collisionOverlayGraphics = this.add.graphics();
      this.collisionOverlayGraphics.setDepth(1000);
    }
    const gfx = this.collisionOverlayGraphics!;
    gfx.clear();

    for (const [, render] of this.entityMap) {
      const coll = render.collisionData;
      if (!coll || !coll.type || coll.type === 'none') continue;

      const w = coll.width || 32;
      const h = coll.height || 32;
      const ox = coll.offsetX || 0;
      const oy = coll.offsetY || 0;
      const x = render.container.x + ox - w / 2;
      const y = render.container.y + oy - h / 2;

      // Draw body rectangle
      gfx.lineStyle(2, 0x00ff88, 0.6);
      gfx.strokeRect(x, y, w, h);

      // Draw corner handles for resize indication
      const handleSize = 4;
      gfx.fillStyle(0x00ff88, 0.8);
      gfx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
      gfx.fillRect(x + w - handleSize/2, y - handleSize/2, handleSize, handleSize);
      gfx.fillRect(x - handleSize/2, y + h - handleSize/2, handleSize, handleSize);
      gfx.fillRect(x + w - handleSize/2, y + h - handleSize/2, handleSize, handleSize);
    }
  }

  private collisionOverlayGraphics: Phaser.GameObjects.Graphics | null = null;

    private ensureAssetTexture(assetRef: string): string | null {
    const img = this.assetCache.get(assetRef);
    if (!img) return null;

    const texKey = `editor-asset:${assetRef}`;
    if (!this.textures.exists(texKey)) {
      this.textures.addImage(texKey, img as any);
    }
    return texKey;
  }

  private hitTestEntities(x: number, y: number): string | null {
    const entries = Array.from(this.entityMap.entries()).reverse();

    for (const [id, render] of entries) {
      if (!render.container.visible) continue;
      if (render.locked) continue;
      if (hitTestEntityBounds({ x, y }, {
        x: render.container.x,
        y: render.container.y,
        width: render.width,
        height: render.height,
        scaleX: render.container.scaleX,
        scaleY: render.container.scaleY,
        rotation: render.container.rotation,
      })) {
        return id;
      }
    }

    return null;
  }

  private pointerToWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: point.x, y: point.y };
  }

  private getRenderWorldBounds(render: EditorEntityRender): Phaser.Geom.Rectangle {
    const corners = [
      new Phaser.Math.Vector2(0, 0),
      new Phaser.Math.Vector2(render.width, 0),
      new Phaser.Math.Vector2(render.width, render.height),
      new Phaser.Math.Vector2(0, render.height),
    ];
    const matrix = render.container.getWorldTransformMatrix();
    const points = corners.map((corner) => matrix.transformPoint(corner.x, corner.y));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  private emitViewportChanged(): void {
    const camera = this.cameras.main;
    this.onViewportChanged({
      x: camera.scrollX,
      y: camera.scrollY,
      zoom: camera.zoom,
    });
  }

  private updateHoverCursor(hitId: string | null): void {
    if (this.dragState || this.panState) return;
    this.setCursor(hitId ? 'move' : 'default');
  }

  private setCursor(cursor: string): void {
    const canvas = this.game?.canvas;
    if (canvas) canvas.style.cursor = cursor;
  }

  private focusCanvas(): void {
    this.game?.canvas?.focus();
  }

  private isCanvasFocused(): boolean {
    return typeof document === 'undefined' || document.activeElement === this.game?.canvas;
  }

  private getEntityLabel(entity: Entity, locked = Boolean(entity.locked)): string {
    const label = entity.name || entity.type || String(entity.id);
    return locked ? `${label} (locked)` : label;
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
        return parseInt(color.slice(1, 7), 16);
      }
      return parseInt(color.slice(0, 6), 16);
    }
    return this.defaultColor(fallbackType);
  }
}
