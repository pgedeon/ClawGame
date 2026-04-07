/**
 * @clawgame/engine - 2D game runtime engine
 */

import type { Entity, Component, Transform, Scene, Layer } from '@clawgame/shared';

// Re-export shared types for convenience
export type { Entity, Component, Transform, Scene, Layer } from '@clawgame/shared';

/**
 * Sprite component data for rendering
 */
interface SpriteData {
  color?: string;
  width?: number;
  height?: number;
}

/**
 * Movement component data
 */
interface MovementData {
  speed?: number;
  vx?: number;
  vy?: number;
}

/**
 * AI component data
 */
interface AIData {
  pattern?: string;
  direction?: number;
  range?: number;
}

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
  private keys: Set<string> = new Set();
  private entityStates: Map<string, { vx: number; vy: number; aiDirection: number; aiStartX: number }> = new Map();

  /**
   * Attach the engine to a canvas element.
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupInput();
  }

  /**
   * Setup keyboard input handlers
   */
  private setupInput(): void {
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      this.keys.add(e.code);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
      this.keys.delete(e.code);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Store references for cleanup
    (this as any)._keyDownHandler = handleKeyDown;
    (this as any)._keyUpHandler = handleKeyUp;
  }

  /**
   * Check if a key is pressed
   */
  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase()) || this.keys.has(`Key${key.toUpperCase()}`) || this.keys.has(`Arrow${key}`);
  }

  /**
   * Add a scene to the engine.
   */
  addScene(scene: Scene): void {
    this.scenes.set(scene.id, scene);
    
    // Initialize entity states
    for (const entity of scene.entities) {
      this.entityStates.set(entity.id, { 
        vx: 0, 
        vy: 0, 
        aiDirection: 1,
        aiStartX: entity.transform.x 
      });
    }
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
    
    // Cleanup input handlers
    if (typeof window !== 'undefined') {
      if ((this as any)._keyDownHandler) {
        window.removeEventListener('keydown', (this as any)._keyDownHandler);
      }
      if ((this as any)._keyUpHandler) {
        window.removeEventListener('keyup', (this as any)._keyUpHandler);
      }
    }
    
    // Clear canvas
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = '#0f0f0f';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
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
   * Get component data by type
   */
  private getComponent<T>(entity: Entity, type: string): T | null {
    const comp = entity.components.find(c => c.type === type);
    return comp ? (comp.data as T) : null;
  }

  /**
   * Update all entities in the active scene.
   */
  private update(dt: number): void {
    const scene = this.getActiveScene();
    if (!scene) return;

    for (const entity of scene.entities) {
      const state = this.entityStates.get(entity.id);
      if (!state) continue;

      // Player movement
      if (entity.name === 'Player') {
        const movement = this.getComponent<MovementData>(entity, 'movement');
        const speed = movement?.speed || 200;
        
        state.vx = 0;
        state.vy = 0;
        
        if (this.isKeyPressed('arrowleft') || this.isKeyPressed('a')) {
          state.vx = -speed;
        }
        if (this.isKeyPressed('arrowright') || this.isKeyPressed('d')) {
          state.vx = speed;
        }
        if (this.isKeyPressed('arrowup') || this.isKeyPressed('w')) {
          state.vy = -speed;
        }
        if (this.isKeyPressed('arrowdown') || this.isKeyPressed('s')) {
          state.vy = speed;
        }
        
        entity.transform.x += state.vx * dt;
        entity.transform.y += state.vy * dt;
        
        // Keep player in bounds
        const sprite = this.getComponent<SpriteData>(entity, 'sprite');
        const halfWidth = (sprite?.width || 32) / 2;
        const halfHeight = (sprite?.height || 32) / 2;
        
        entity.transform.x = Math.max(halfWidth, Math.min(800 - halfWidth, entity.transform.x));
        entity.transform.y = Math.max(halfHeight, Math.min(600 - halfHeight, entity.transform.y));
      }
      
      // AI movement (patrol pattern)
      const ai = this.getComponent<AIData>(entity, 'ai');
      if (ai && ai.pattern === 'patrol') {
        const range = ai.range || 100;
        const aiSpeed = 80;
        
        entity.transform.x += state.aiDirection * aiSpeed * dt;
        
        if (entity.transform.x > state.aiStartX + range) {
          state.aiDirection = -1;
        } else if (entity.transform.x < state.aiStartX - range) {
          state.aiDirection = 1;
        }
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

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const scene = this.getActiveScene();
    if (!scene) {
      // Draw "No Scene" message
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No scene loaded', width / 2, height / 2);
      return;
    }

    // Render visible layers
    for (const layer of scene.layers) {
      if (!layer.visible) continue;

      for (const entityId of layer.entityIds) {
        const entity = scene.entities.find((e: Entity) => e.id === entityId);
        if (!entity) continue;

        const sprite = this.getComponent<SpriteData>(entity, 'sprite');
        const color = sprite?.color || '#ff6b35';
        const w = sprite?.width || 32;
        const h = sprite?.height || 32;
        
        const x = entity.transform.x - w / 2;
        const y = entity.transform.y - h / 2;

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 4, y + 4, w, h);
        
        // Draw entity
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        
        // Draw highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, w, h / 4);
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        // Draw name label for player
        if (entity.name === 'Player') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = '12px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Player', entity.transform.x, y - 8);
        }
      }
    }

    // Draw scene name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Scene: ${scene.name}`, 16, 24);
  }
}
