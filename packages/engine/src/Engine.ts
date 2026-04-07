/**
 * @clawgame/engine - Main engine class
 */

import { Entity, Scene, InputState, RendererConfig } from './types';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { AISystem } from './systems/AISystem';
import { RenderSystem } from './systems/RenderSystem';

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: Scene | null = null;
  private inputState: InputState = { up: false, down: false, left: false, right: false };
  private isRunning = false;
  private lastTime = 0;
  private config: RendererConfig;

  // Systems
  private inputSystem: InputSystem;
  private movementSystem: MovementSystem;
  private aiSystem: AISystem;
  private renderSystem: RenderSystem;

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

    // Initialize systems
    this.inputSystem = new InputSystem();
    this.movementSystem = new MovementSystem();
    this.aiSystem = new AISystem();
    this.renderSystem = new RenderSystem(this.ctx, this.config);
  }

  /**
   * Load a scene
   */
  loadScene(scene: Scene): void {
    this.scene = scene;
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
  }

  /**
   * Get current config
   */
  getConfig(): RendererConfig {
    return { ...this.config };
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

    try {
      this.update(deltaTime);
      this.render();
      requestAnimationFrame(this.gameLoop);
    } catch (error) {
      this.handleError(error as Error);
    }
  };

  /**
   * Update all systems
   */
  private update(deltaTime: number): void {
    if (!this.scene) return;

    // Update input state
    this.inputState = this.inputSystem.getState();

    // Run custom update callback
    this.updateCallback?.(deltaTime);

    // Run systems
    this.movementSystem.update(this.scene, this.inputState, deltaTime);
    this.aiSystem.update(this.scene, deltaTime);
  }

  /**
   * Render the scene
   */
  private render(): void {
    if (!this.scene) return;

    this.renderSystem.render(this.scene, this.config);
  }

  /**
   * Setup keyboard event listeners
   */
  private setupEventListeners(): void {
    this.inputSystem.attach();
  }

  /**
   * Cleanup event listeners
   */
  private cleanupEventListeners(): void {
    this.inputSystem.detach();
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('Engine error:', error);
    this.errorCallback?.(error);
  }
}
