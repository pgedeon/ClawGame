/**
 * @clawgame/engine - Main engine class
 */

import { Entity, Scene, InputState, RendererConfig } from './types';
import { EventBus } from './EventBus';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { AISystem } from './systems/AISystem';
import { RenderSystem } from './systems/RenderSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { AnimationSystem } from './systems/AnimationSystem';

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: Scene | null = null;
  private inputState: InputState = { up: false, down: false, left: false, right: false };
  private isRunning = false;
  private lastTime = 0;
  private config: RendererConfig;

  /** Shared event bus for all engine communication */
  readonly events: EventBus;

  // Systems
  private inputSystem: InputSystem;
  private movementSystem: MovementSystem;
  private aiSystem: AISystem;
  private renderSystem: RenderSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private animationSystem: AnimationSystem;

  private updateCallback?: (deltaTime: number) => void;
  private errorCallback?: (error: Error) => void;

  constructor(canvas: HTMLCanvasElement, config: RendererConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.config = config;

    // Initialize event bus
    this.events = new EventBus();

    // Initialize systems
    this.inputSystem = new InputSystem();
    this.movementSystem = new MovementSystem();
    this.aiSystem = new AISystem();
    this.renderSystem = new RenderSystem(this.ctx, this.config);
    this.physicsSystem = new PhysicsSystem({ width: config.width, height: config.height });
    this.collisionSystem = new CollisionSystem();
    this.animationSystem = new AnimationSystem();

    // Wire systems to event bus
    this.collisionSystem.attach(this.events);
    this.animationSystem.attach(this.events);
  }

  /**
   * Load a scene
   */
  loadScene(scene: Scene): void {
    const prevName = this.scene?.name;
    this.scene = scene;
    this.collisionSystem.resetTriggers();
    this.animationSystem.reset();
    if (prevName) {
      this.events.emit('scene:unload', { sceneName: prevName });
    }
    this.events.emit('scene:load', { sceneName: scene.name });
  }

  /**
   * Get current input state
   */
  getInputState(): InputState {
    return this.inputState;
  }

  /**
   * Get current scene
   */
  getScene(): Scene | null {
    return this.scene;
  }

  /**
   * Get current FPS from render system
   */
  getFPS(): number {
    return this.renderSystem.getFPS();
  }

  /**
   * Update renderer config at runtime (e.g. toggle grid/hitboxes)
   */
  setConfig(partial: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...partial };
    this.physicsSystem.setWorldBounds({ width: this.config.width, height: this.config.height });
  }

  /**
   * Get current config
   */
  getConfig(): RendererConfig {
    return { ...this.config };
  }

  /**
   * Register a frame image for animation rendering
   */
  registerFrameImage(assetRef: string, image: HTMLImageElement): void {
    this.renderSystem.registerFrameImage(assetRef, image);
  }

  /**
   * Set callback for when error occurs
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Set callback for each update frame
   */
  onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.setupEventListeners();
      this.events.emit('engine:start', {});
      this.gameLoop();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false;
    this.cleanupEventListeners();
    this.events.emit('engine:stop', {});
  }

  /**
   * Check if engine is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Destroy the engine — stop loop, detach input, cleanup render system
   */
  destroy(): void {
    this.stop();
    this.renderSystem.destroy();
    this.animationSystem.destroy();
    this.events.clear();
    this.scene = null;
  }

  /**
   * Main game loop
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Update input state from keyboard
    this.inputSystem.update(this.canvas, this.inputState);

    // Update scene with all systems
    if (this.scene) {
      this.physicsSystem.update(this.scene, deltaTime);
      this.movementSystem.update(this.scene, this.inputSystem.getState(), deltaTime);
      this.aiSystem.update(this.scene, deltaTime);
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
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Setup event listeners for user input
   */
  private setupEventListeners(): void {
    // Canvas keyboard events
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Cleanup event listeners when stopping
   */
  private cleanupEventListeners(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Handle key down events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowUp':
        this.inputState.up = true;
        break;
      case 'ArrowDown':
        this.inputState.down = true;
        break;
      case 'ArrowLeft':
        this.inputState.left = true;
        break;
      case 'ArrowRight':
        this.inputState.right = true;
        break;
    }
  };

  /**
   * Handle key up events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowUp':
        this.inputState.up = false;
        break;
      case 'ArrowDown':
        this.inputState.down = false;
        break;
      case 'ArrowLeft':
        this.inputState.left = false;
        break;
      case 'ArrowRight':
        this.inputState.right = false;
        break;
    }
  };

  /**
   * Handle errors from systems or game loop
   */
  private handleError(error: Error): void {
    console.error('Engine error:', error);
    if (this.errorCallback) {
      this.errorCallback(error);
    }
    this.events.emit('engine:error' as any, { error, message: error.message, timestamp: performance.now() });
  }
}