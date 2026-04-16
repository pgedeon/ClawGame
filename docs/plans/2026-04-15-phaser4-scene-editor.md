# Phaser 4 Scene Editor Integration Plan

> **For agentic workers:** Use superpowers-subagent-dev or superpowers-executing-plans to implement this plan task-by-task.

**Goal:** Replace the HTML5 Canvas 2D scene editor canvas with a Phaser 4-powered renderer, bringing real-time physics visualization, particle effects, tilemap support, tweens/animation preview, and live game object manipulation.

**Architecture:** The `SceneCanvas` component currently renders entities as colored rectangles on a plain Canvas 2D context. We replace it with a Phaser 4 `Game` instance that renders the same canonical `Entity` data as real Phaser `GameObject`s (Sprites, Rectangle shapes, Text labels, Containers). The editor overlays (selection handles, grid, ghost placement) are rendered as Phaser Graphics on top. All entity state remains in React; Phaser is a pure view layer that syncs from React state each frame.

**Tech Stack:** Phaser 4.0.0 (Arcade physics, GameObjects, Tilemaps, Tweens, Particles, Graphics), React 18, @clawgame/engine canonical types

---

## Key Phaser 4 Features to Integrate

| Feature | Editor Use | Phaser API |
|---------|-----------|------------|
| **Sprite rendering** | Show actual asset images instead of colored boxes | `this.add.image()` / `this.add.sprite()` |
| **Arcade Physics** | Visualize collision bodies, debug draw, test overlaps | `this.physics.add.existing()`, `body.setDebug()` |
| **Tilemaps** | Paint tiles, load Tiled JSON, tile collision | `this.make.tilemap()`, TilemapLayer |
| **Particle effects** | Preview particle emitters on entities | `this.add.particles()` |
| **Tweens** | Animate properties in-editor preview | `this.tweens.add()` |
| **Containers** | Group entities, parent-child transforms | `this.add.container()` |
| **Graphics** | Grid lines, selection handles, gizmos | `this.add.graphics()` |
| **Text** | Entity labels, debug info | `this.add.text()` |
| **Groups** | Entity type grouping, batch operations | `this.physics.add.group()` |
| **Cursors/Camera** | Pan/zoom via camera, not viewport transform | `this.cameras.main.pan/zoomTo()` |
| **Input** | Click-select, drag-move, multi-select | `this.input.on('pointerdown')`, drag plugins |
| **RenderTexture** | Minimap preview | `this.add.renderTexture()` |

---

## File Structure

### New Files
- `apps/web/src/runtime/PhaserSceneEditor.ts` — Phaser Scene subclass for the editor
- `apps/web/src/runtime/SceneEditorRuntime.ts` — Manager class: creates/destroys Phaser Game, syncs state

### Modified Files
- `apps/web/src/components/scene-editor/SceneCanvas.tsx` — Replace Canvas 2D with Phaser runtime mount
- `apps/web/src/components/scene-editor/types.ts` — Add new tool modes, Phaser-specific state
- `apps/web/src/components/scene-editor/PropertyInspector.tsx` — Add physics/tween/particle component editors
- `apps/web/src/components/scene-editor/SceneEditorPage.tsx` — (rename: already in SceneEditorPage.tsx, no change needed)

### Unchanged Files
- `apps/web/src/components/scene-editor/AssetBrowserPanel.tsx`
- `apps/web/src/components/scene-editor/SceneHierarchyTree.tsx`
- `apps/web/src/components/scene-editor/SceneEditorAIBar.tsx`
- `apps/web/src/utils/sceneEditorScene.ts`
- All engine package files

---

## Task 1: Create PhaserSceneEditor — Core Rendering

**Files:**
- Create: `apps/web/src/runtime/PhaserSceneEditor.ts`

This is the Phaser Scene that renders editor entities as real GameObjects.

### Step 1: Create the file with entity sync

```typescript
import { Scene, GameObjects, Cameras, Input, Physics, Graphics, Scale } from 'phaser';
import type { Entity, Transform, SpriteComponent as Sprite, CollisionComponent as Collision } from '@clawgame/engine';

export interface EditorEntityRender {
  phaserId: string;        // internal map key
  gameObject: GameObjects.GameObject;
  container: GameObjects.Container;
  label: GameObjects.Text;
  body?: Physics.Arcade.Body;
  selectionBox?: Graphics;
}

export class PhaserSceneEditor extends Scene {
  private entityMap: Map<string, EditorEntityRender> = new Map();
  private gridGraphics!: Graphics;
  private overlayGraphics!: Graphics;
  private ghostObject: GameObjects.Container | null = null;
  private assetCache: Map<string, HTMLImageElement> = new Map();

  // Editor state (set from React)
  public showGrid: boolean = true;
  public gridSize: number = 32;
  public snapping: boolean = true;
  public selectedEntityId: string | null = null;
  public viewportZoom: number = 1;

  // Callbacks to React
  public onEntityMoved?: (entityId: string, x: number, y: number) => void;
  public onEntitySelected?: (entityId: string | null) => void;
  public onViewportChanged?: (x: number, y: number, zoom: number) => void;

  constructor() {
    super({ key: 'clawgame-scene-editor' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#09111f');
    this.cameras.main.setZoom(1);

    // Grid layer (rendered behind entities)
    this.gridGraphics = this.add.graphics().setDepth(0);
    this.overlayGraphics = this.add.graphics().setDepth(1000);

    // Enable camera controls
    this.setupCameraControls();
    this.setupInputHandlers();
    this.drawGrid();
  }

  update(_time: number, _delta: number): void {
    // Sync selection overlay
    this.drawSelectionOverlay();
  }

  /** Full sync: rebuild all game objects from entity list */
  syncEntities(entities: Entity[], assetCache: Map<string, HTMLImageElement>): void {
    this.assetCache = assetCache;
    const activeIds = new Set(entities.map(e => e.id));

    // Remove deleted entities
    for (const [id] of this.entityMap) {
      if (!activeIds.has(id)) this.removeEntity(id);
    }

    // Add/update entities
    for (const entity of entities) {
      this.syncEntity(entity);
    }
  }

  private syncEntity(entity: Entity): void {
    const existing = this.entityMap.get(entity.id);
    const sprite = entity.components?.get?.('sprite') as Sprite | undefined;
    const collision = entity.components?.get?.('collision') as Collision | undefined;

    const width = sprite?.width || collision?.width || 32;
    const height = sprite?.height || collision?.height || 32;
    const color = sprite?.color || this.getColorForType(entity.type);

    if (existing) {
      // Update position
      existing.container.setPosition(entity.transform.x, entity.transform.y);
      existing.container.setScale(entity.transform.scaleX || 1, entity.transform.scaleY || 1);
      existing.container.setAngle(entity.transform.rotation || 0);
      // Update label position
      existing.label.setPosition(0, -height / 2 - 16);
      existing.label.setText(entity.type || 'entity');
      return;
    }

    // Create new
    const container = this.add.container(entity.transform.x, entity.transform.y);
    container.setDepth(10);

    let renderObj: GameObjects.GameObject;
    const spriteAssetRef = (sprite as any)?.assetRef || (sprite as any)?.image;

    if (spriteAssetRef && this.assetCache.has(String(spriteAssetRef))) {
      // Has asset — try to create Phaser texture from cached image
      const texKey = `editor-asset:${spriteAssetRef}`;
      if (!this.textures.exists(texKey)) {
        const img = this.assetCache.get(String(spriteAssetRef))!;
        this.textures.addImage(texKey, img as any);
      }
      const image = this.add.image(0, 0, texKey);
      image.setDisplaySize(width, height);
      image.setOrigin(0, 0);
      renderObj = image;
    } else {
      // No asset — colored rectangle
      const rect = this.add.rectangle(0, 0, width, height, this.parseColorHex(color));
      rect.setOrigin(0, 0);
      rect.setStrokeStyle(2, 0xffffff, 0.15);
      renderObj = rect;
    }

    // Label
    const label = this.add.text(width / 2, -height / 2 - 16, entity.type || 'entity', {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: 'rgba(15,23,42,0.9)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0.5);

    container.add([renderObj, label]);

    // Physics visualization (debug body)
    if (collision && collision.type !== 'none') {
      this.physics.add.existing(container, collision.type === 'wall');
      const body = container.body as Physics.Arcade.Body;
      body.setSize(width, height);
      body.setDebug(body.x, body.y, 0x00ff00, 0x00ff00);
    }

    this.entityMap.set(entity.id, {
      phaserId: entity.id,
      gameObject: renderObj,
      container,
      label,
    });
  }

  private removeEntity(id: string): void {
    const render = this.entityMap.get(id);
    if (render) {
      render.container.destroy(true);
      this.entityMap.delete(id);
    }
  }

  setAssetCache(cache: Map<string, HTMLImageElement>): void {
    this.assetCache = cache;
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

  showGhostEntity(template: { type: string; width: number; height: number; color: string } | null): void {
    if (this.ghostObject) { this.ghostObject.destroy(); this.ghostObject = null; }
    if (!template) return;
    this.ghostObject = this.add.container(0, 0);
    const rect = this.add.rectangle(0, 0, template.width, template.height, this.parseColorHex(template.color), 0.5);
    rect.setOrigin(0, 0);
    rect.setStrokeStyle(2, 0xffffff, 0.5);
    this.ghostObject.add(rect);
    this.ghostObject.setDepth(500);
    this.ghostObject.setAlpha(0.6);
  }

  moveGhostEntity(worldX: number, worldY: number): void {
    if (!this.ghostObject) return;
    const x = this.snapping ? Math.round(worldX / this.gridSize) * this.gridSize : worldX;
    const y = this.snapping ? Math.round(worldY / this.gridSize) * this.gridSize : worldY;
    this.ghostObject.setPosition(x, y);
  }

  private setupCameraControls(): void {
    // Middle-click or Alt+left-click to pan
    const cam = this.cameras.main;
    this.input.on('pointermove', (pointer: Input.Pointer) => {
      if (pointer.isDown && (pointer.rightButtonDown() || pointer.altKey)) {
        cam.setScroll(
          cam.scrollX - (pointer.x - pointer.prevPosition.x) / cam.zoom,
          cam.scrollY - (pointer.y - pointer.prevPosition.y) / cam.zoom,
        );
      }
      // Move ghost entity if active
      if (this.ghostObject) {
        const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);
        this.moveGhostEntity(worldPoint.x, worldPoint.y);
      }
    });

    this.input.on('wheel', (_pointer: Input.Pointer, _go: any[], _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.1, 5);
      cam.setZoom(newZoom);
      this.viewportZoom = newZoom;
      this.onViewportChanged?.(cam.scrollX, cam.scrollY, newZoom);
      this.drawGrid();
    });
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Check if clicked on an entity
      let clicked: string | null = null;
      for (const [id, render] of this.entityMap) {
        const bounds = render.container.getBounds();
        if (bounds.contains(worldPoint.x, worldPoint.y)) {
          clicked = id;
          break;
        }
      }
      this.selectedEntityId = clicked;
      this.onEntitySelected?.(clicked);
    });

    // Drag selected entity
    this.input.on('pointermove', (pointer: Input.Pointer) => {
      if (!pointer.isDown || pointer.rightButtonDown() || pointer.altKey) return;
      if (!this.selectedEntityId) return;
      const render = this.entityMap.get(this.selectedEntityId);
      if (!render) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      let x = worldPoint.x;
      let y = worldPoint.y;
      if (this.snapping) {
        x = Math.round(x / this.gridSize) * this.gridSize;
        y = Math.round(y / this.gridSize) * this.gridSize;
      }
      render.container.setPosition(x, y);
      this.onEntityMoved?.(this.selectedEntityId, x, y);
    });
  }

  private drawGrid(): void {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();

    if (!this.showGrid) return;

    const cam = this.cameras.main;
    const grid = this.gridSize;
    const viewLeft = cam.scrollX - cam.width / 2 / cam.zoom;
    const viewTop = cam.scrollY - cam.height / 2 / cam.zoom;
    const viewRight = cam.scrollX + cam.width / 2 / cam.zoom;
    const viewBottom = cam.scrollY + cam.height / 2 / cam.zoom;

    this.gridGraphics.lineStyle(1, 0x475569, 0.3);
    const startX = Math.floor(viewLeft / grid) * grid;
    const startY = Math.floor(viewTop / grid) * grid;

    for (let x = startX; x <= viewRight; x += grid) {
      this.gridGraphics.lineBetween(x, viewTop, x, viewBottom);
    }
    for (let y = startY; y <= viewBottom; y += grid) {
      this.gridGraphics.lineBetween(viewLeft, y, viewRight, y);
    }

    // Origin axes
    this.gridGraphics.lineStyle(2, 0x60a5fa, 0.4);
    this.gridGraphics.lineBetween(-100, 0, 100, 0);
    this.gridGraphics.lineBetween(0, -100, 0, 100);
  }

  private drawSelectionOverlay(): void {
    if (!this.overlayGraphics) return;
    this.overlayGraphics.clear();

    if (!this.selectedEntityId) return;
    const render = this.entityMap.get(this.selectedEntityId);
    if (!render) return;

    const bounds = render.container.getBounds();
    this.overlayGraphics.lineStyle(2.5, 0x60a5fa, 0.9);
    this.overlayGraphics.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);

    // Resize handles
    const hs = 6;
    this.overlayGraphics.fillStyle(0x3b82f6, 1);
    this.overlayGraphics.fillRect(bounds.x - hs/2, bounds.y - hs/2, hs, hs);
    this.overlayGraphics.fillRect(bounds.x + bounds.width - hs/2, bounds.y - hs/2, hs, hs);
    this.overlayGraphics.fillRect(bounds.x - hs/2, bounds.y + bounds.height - hs/2, hs, hs);
    this.overlayGraphics.fillRect(bounds.x + bounds.width - hs/2, bounds.y + bounds.height - hs/2, hs, hs);
  }

  private getColorForType(type?: string): string {
    const colors: Record<string, string> = {
      player: '#3b82f6', enemy: '#ef4444', collectible: '#f59e0b',
      obstacle: '#64748b', npc: '#22c55e', platform: '#475569',
      custom: '#8b5cf6',
    };
    return colors[type || ''] || '#8b5cf6';
  }

  private parseColorHex(hex: string): number {
    if (!hex || !hex.startsWith('#')) return 0x8b5cf6;
    return parseInt(hex.replace('#', ''), 16);
  }
}
```

### Step 2: Verify typecheck passes

Run: `cd /root/projects/clawgame && pnpm --filter @clawgame/web exec tsc --noEmit`
Expected: No errors in PhaserSceneEditor.ts

---

## Task 2: Create SceneEditorRuntime — Game Lifecycle Manager

**Files:**
- Create: `apps/web/src/runtime/SceneEditorRuntime.ts`

```typescript
import { Game, AUTO, Scale } from 'phaser';
import { PhaserSceneEditor } from './PhaserSceneEditor';

export class SceneEditorRuntime {
  private game: Game | null = null;
  private scene: PhaserSceneEditor | null = null;

  mount(parent: HTMLElement): void {
    if (this.game) this.destroy();

    this.scene = new PhaserSceneEditor();

    this.game = new Game({
      type: AUTO,
      width: parent.clientWidth,
      height: parent.clientHeight,
      parent,
      backgroundColor: '#09111f',
      scene: [this.scene],
      physics: {
        default: 'arcade',
        arcade: { debug: true },
      },
      scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
      },
      input: { keyboard: true, mouse: true, touch: true },
      // Disable audio in editor
      audio: { noAudio: true },
    });
  }

  getScene(): PhaserSceneEditor | null {
    return this.scene;
  }

  resize(width: number, height: number): void {
    this.game?.scale.resize(width, height);
  }

  destroy(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.scene = null;
  }
}
```

---

## Task 3: Rewrite SceneCanvas to use Phaser Runtime

**Files:**
- Modify: `apps/web/src/components/scene-editor/SceneCanvas.tsx`

Replace the entire Canvas 2D implementation with a Phaser mount. Key changes:
- Remove all manual `ctx.fillRect()`, `ctx.strokeRect()` drawing code
- Remove manual viewport transform (`ctx.translate/scale`)
- Replace with `SceneEditorRuntime.mount()` on mount, sync entities via `scene.syncEntities()`
- Camera pan/zoom via Phaser camera instead of viewport state
- Entity selection/drag via Phaser input instead of manual hit-testing
- Drop/drag asset support preserved via Phaser texture loading

The component becomes a thin bridge: React state → Phaser scene sync.

---

## Task 4: Add Physics Debug Visualization

**Files:**
- Modify: `apps/web/src/runtime/PhaserSceneEditor.ts`
- Modify: `apps/web/src/components/scene-editor/PropertyInspector.tsx`

Add physics body debug drawing toggle:
- Green outlines for static bodies
- Blue outlines for dynamic bodies
- Yellow outlines for sensor/trigger bodies
- Velocity arrows for dynamic bodies
- Add "Show Physics" toggle to editor toolbar
- PropertyInspector: show physics body properties (mass, bounce, friction, velocity)

---

## Task 5: Add Tilemap Support

**Files:**
- Modify: `apps/web/src/runtime/PhaserSceneEditor.ts`
- Modify: `apps/web/src/components/scene-editor/types.ts`
- Add new ToolMode: 'paint-tile'
- Add tile painting: click to place tiles on grid
- Support loading Tiled JSON exports as tilemap layers
- Tile collision toggle per-tile

---

## Task 6: Add Tween/Animation Preview

**Files:**
- Modify: `apps/web/src/runtime/PhaserSceneEditor.ts`
- Modify: `apps/web/src/components/scene-editor/PropertyInspector.tsx`

- Preview bounce, fade, scale, rotation tweens on selected entity
- Tween config panel in PropertyInspector
- Play/stop tween preview buttons

---

## Task 7: Add Particle Effect Preview

**Files:**
- Modify: `apps/web/src/runtime/PhaserSceneEditor.ts`
- Modify: `apps/web/src/components/scene-editor/PropertyInspector.tsx`

- Attach particle emitters to entities for preview
- Config panel for: rate, lifespan, speed, color, alpha, scale
- Start/stop particle preview

---

## Task 8: Add Minimap via RenderTexture

**Files:**
- Modify: `apps/web/src/runtime/PhaserSceneEditor.ts`

- Small minimap in corner showing entire scene
- Viewport indicator rectangle
- Click minimap to jump camera

---

## Verification

After all tasks:
1. `pnpm typecheck` — 0 errors
2. `pnpm test` — all tests pass
3. Manual: Open scene editor, add entities, drag, select, zoom, toggle grid/physics
4. Manual: Attach asset to entity → shows real image
5. Manual: Enable physics debug → bodies visible
6. Manual: Start tween preview → entity animates
