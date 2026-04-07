/**
 * @clawgame/engine - 2D game runtime engine
 */

import type { Entity, Component, Transform, Scene, Layer } from '@clawgame/shared';

// Re-export shared types for convenience
export type { Entity, Component, Transform, Scene, Layer } from '@clawgame/shared';

/**
 * Core engine class — manages the game loop, scenes, and entities.
 */
export class Engine {
  private scenes: Map<string, Scene> = new Map();
  private activeSceneId: string | null = null;
  private running = false;
  private lastTime = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /**
   * Attach the engine to a canvas element.
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Add a scene to the engine.
   */
  addScene(scene: Scene): void {
    this.scenes.set(scene.id, scene);
  }

  /**
   * Set the active scene by ID.
   */
  setActiveScene(sceneId: string): boolean {
    if (!this.scenes.has(sceneId)) return false;
    this.activeSceneId = sceneId;
    return true;
  }

  /**
   * Get the active scene.
   */
  getActiveScene(): Scene | null {
    if (!this.activeSceneId) return null;
    return this.scenes.get(this.activeSceneId) ?? null;
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Main game loop.
   */
  private loop = (time: number): void => {
    if (!this.running) return;

    const dt = (time - this.lastTime) / 1000; // delta in seconds
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  /**
   * Update all entities in the active scene.
   */
  private update(_dt: number): void {
    const scene = this.getActiveScene();
    if (!scene) return;

    // Placeholder: iterate entities and update components
    for (const entity of scene.entities) {
      for (const component of entity.components) {
        // Future: dispatch to component update systems
      }
    }
  }

  /**
   * Render the active scene.
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Clear
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    const scene = this.getActiveScene();
    if (!scene) return;

    // Render visible layers
    for (const layer of scene.layers) {
      if (!layer.visible) continue;

      for (const entityId of layer.entityIds) {
        const entity = scene.entities.find((e: Entity) => e.id === entityId);
        if (!entity) continue;

        // Placeholder: render a colored rect for each entity
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(
          entity.transform.x - 16,
          entity.transform.y - 16,
          32,
          32
        );
      }
    }
  }
}
