/**
 * @clawgame/engine - Main game engine
 *
 * Coordinates systems, manages game loop, handles scene lifecycle,
 * and provides core engine services to the application.
 */

import type { Scene, InputState } from './types';
import { EventBus } from './EventBus';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { AISystem } from './systems/AISystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { AnimationSystem } from './systems/AnimationSystem';
import { RenderSystem } from './systems/RenderSystem';
import { DamageSystem } from './systems/DamageSystem';

export type EngineOptions = {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  debug?: boolean;
};

export class Engine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;
  private debug: boolean = false;

  // Core systems
  public eventBus: EventBus;
  public inputSystem: InputSystem;
  public movementSystem: MovementSystem;
  public physicsSystem: PhysicsSystem;
  public aiSystem: AISystem;
  public projectileSystem: ProjectileSystem;
  public collisionSystem: CollisionSystem;
  public animationSystem: AnimationSystem;
  public renderSystem: RenderSystem;
  public damageSystem: DamageSystem;

  // Scene management
  public scene: Scene | null = null;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private updateCallback: ((deltaTime: number) => void) | null = null;

  constructor(options: EngineOptions = {}) {
    // Setup canvas and context
    if (options.canvas) {
      this.setCanvas(options.canvas);
    } else {
      this.width = options.width || this.width;
      this.height = options.height || this.height;
    }
    this.debug = options.debug || this.debug;

    // Initialize systems
    this.eventBus = new EventBus();
    this.inputSystem = new InputSystem();
    this.movementSystem = new MovementSystem({ width: this.width, height: this.height });
    this.physicsSystem = new PhysicsSystem({ width: this.width, height: this.height });
    this.aiSystem = new AISystem();
    this.projectileSystem = new ProjectileSystem({ width: this.width, height: this.height });
    this.collisionSystem = new CollisionSystem();
    this.animationSystem = new AnimationSystem();
    this.renderSystem = new RenderSystem();
    this.damageSystem = new DamageSystem();

    // Connect systems to event bus
    this.projectileSystem.attach(this.eventBus);
    this.damageSystem.attach(this.eventBus);

    // Setup debug logging
    if (this.debug) {
      console.log('Engine initialized with systems:', {
        input: this.inputSystem,
        movement: this.movementSystem,
        physics: this.physicsSystem,
        ai: this.aiSystem,
        projectile: this.projectileSystem,
        collision: this.collisionSystem,
        animation: this.animationSystem,
        render: this.renderSystem,
        damage: this.damageSystem,
      });
    }
  }

  /**
   * Set the canvas element for the engine
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Could not get 2D rendering context');
    }

    // Set canvas size
    this.width = canvas.width;
    this.height = canvas.height;

    // Bind input system to canvas
    this.inputSystem.bind(canvas);

    // Set canvas on render system
    this.renderSystem.setCanvas(canvas);

    if (this.debug) {
      console.log(`Engine bound to canvas ${this.width}x${this.height}`);
    }
  }

  /**
   * Get the current scene
   */
  getScene(): Scene | null {
    return this.scene;
  }

  /**
   * Set the current scene
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    
    if (this.debug) {
      console.log(`Scene set with ${scene.entities.size} entities`);
    }
  }

  /**
   * Load a scene from scene data
   */
  loadScene(sceneData: { name: string; entities: Map<string, any> }): Scene {
    const scene: Scene = {
      name: sceneData.name,
      entities: sceneData.entities,
    };
    this.setScene(scene);
    return scene;
  }

  /**
   * Create a new default scene
   */
  createScene(): Scene {
    const scene: Scene = {
      name: `scene-${Date.now()}`,
      entities: new Map(),
    };
    this.setScene(scene);
    return scene;
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.animationFrameId !== null) {
      console.warn('Engine already started');
      return;
    }

    if (this.debug) {
      console.log('Starting game loop');
    }

    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.animationFrameId === null) {
      console.warn('Engine not running');
      return;
    }

    if (this.debug) {
      console.log('Stopping game loop');
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  /**
   * Set the update callback
   */
  setUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Main game loop
   */
  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 0.1s to prevent huge jumps
    this.lastTime = currentTime;

    // Update scene with all systems
    if (this.scene) {
      // Update input system
      this.inputSystem.update(this.scene, this.inputSystem.getState());

      // Update scene with all systems
      this.physicsSystem.update(this.scene, deltaTime);
      this.movementSystem.update(this.scene, deltaTime);
      this.aiSystem.update(this.scene, deltaTime);
      this.projectileSystem.update(this.scene, deltaTime);
      this.collisionSystem.update(this.scene);
      this.animationSystem.update(this.scene, deltaTime);

      // Render scene
      this.renderSystem.update(this.scene, deltaTime);

      // Call user callback if registered
      if (this.updateCallback) {
        this.updateCallback(deltaTime);
      }
    }

    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Destroy the engine — stop loop, detach input, cleanup render system
   */
  destroy(): void {
    this.stop();

    // Detach all systems
    this.inputSystem.unbind();
    if (this.inputSystem.detach) this.inputSystem.detach();
    if (this.aiSystem.detach) this.aiSystem.detach();
    if (this.movementSystem.detach) this.movementSystem.detach();
    if (this.physicsSystem.detach) this.physicsSystem.detach();
    if (this.projectileSystem.detach) this.projectileSystem.detach();
    if (this.collisionSystem.detach) this.collisionSystem.detach();
    if (this.animationSystem.detach) this.animationSystem.detach();
    if (this.renderSystem.detach) this.renderSystem.detach();
    if (this.damageSystem.detach) this.damageSystem.detach();

    if (this.debug) {
      console.log('Engine destroyed');
    }
  }
}