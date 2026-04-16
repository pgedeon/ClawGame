/**
 * @clawgame/engine - Sprite Sheet System
 *
 * Loads and manages sprite sheet assets, providing frame-based rendering
 * support for the RenderSystem. Integrates with the existing sprite sheet
 * service API to load sprite sheet definitions and images.
 */

import { SpriteComponent, AnimationComponent } from '../types';
import { EventBus } from '../EventBus';

export interface SpriteSheetData {
  id: string;
  name: string;
  prompt: string;
  artStyle: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  frames: Array<{
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    duration?: number;
  }>;
  animations: Array<{
    name: string;
    frames: number[];
    loop: boolean;
    speed: number;
  }>;
  createdAt: string;
}

export interface SpriteSheetCache {
  data: SpriteSheetData;
  image: HTMLImageElement;
  loaded: boolean;
}

export class SpriteSheetSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cache = new Map<string, SpriteSheetCache>();
  private eventBus: EventBus | null = null;

  /** Attach to event bus and canvas */
  attach(canvas: HTMLCanvasElement, eventBus?: EventBus): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus || null;
  }

  /**
   * Load a sprite sheet by name
   */
  async loadSpriteSheet(projectId: string, name: string): Promise<SpriteSheetCache | null> {
    const cacheKey = `${projectId}:${name}`;
    
    // Return if already loaded
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Load sprite sheet metadata (in a real implementation, this would come from the API)
      const response = await fetch(`/api/projects/${projectId}/sprites/${name}`);
      if (!response.ok) return null;
      
      const spriteSheetData: SpriteSheetData = await response.json();
      
      // Load the sprite sheet image
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = `/api/projects/${projectId}/assets/sprites/${name}.svg`;
      });

      const cache: SpriteSheetCache = {
        data: spriteSheetData,
        image,
        loaded: true,
      };

      this.cache.set(cacheKey, cache);
      return cache;

    } catch (error) {
      console.error(`Failed to load sprite sheet ${name}:`, error);
      return null;
    }
  }

  /**
   * Get animation frames for a sprite sheet
   */
  getAnimationFrames(
    spriteSheet: SpriteSheetCache,
    animationName: string
  ): Array<{
    frameIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    duration?: number;
  }> {
    const animation = spriteSheet.data.animations.find(a => a.name === animationName);
    if (!animation) return [];

    return animation.frames.map(frameIndex => {
      const frame = spriteSheet.data.frames[frameIndex];
      return {
        frameIndex,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        duration: frame.duration,
      };
    });
  }

  /**
   * Render a sprite sheet frame
   */
  renderSpriteFrame(
    ctx: CanvasRenderingContext2D,
    sprite: SpriteComponent,
    spriteSheet: SpriteSheetCache,
    frameIndex: number,
    transform: { x: number; y: number; width?: number; height?: number },
    flipX: boolean = false,
    flipY: boolean = false,
    opacity: number = 1
  ): void {
    const frame = spriteSheet.data.frames[frameIndex];
    if (!frame) return;

    const sourceWidth = sprite.frameWidth || frame.width;
    const sourceHeight = sprite.frameHeight || frame.height;
    const targetWidth = transform.width || sourceWidth;
    const targetHeight = transform.height || sourceHeight;

    ctx.save();

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Move to transform position
    ctx.translate(transform.x, transform.y);

    // Apply scaling
    let scaleX = 1;
    let scaleY = 1;
    
    if (flipX) scaleX = -1;
    if (flipY) scaleY = -1;
    
    ctx.scale(scaleX, scaleY);

    // Draw the frame from the sprite sheet
    ctx.drawImage(
      spriteSheet.image,
      frame.x,           // source x
      frame.y,           // source y  
      sourceWidth,       // source width
      sourceHeight,      // source height
      -targetWidth / 2,   // target x (centered)
      -targetHeight / 2,  // target y (centered)
      targetWidth,       // target width
      targetHeight       // target height
    );

    ctx.restore();
  }

  /**
   * Update sprite-based entities to use sprite sheets
   */
  updateSpriteComponents(scene: any): void {
    // This would integrate with the main game loop
    // For now, it provides utility methods for the RenderSystem
  }

  /**
   * Get sprite sheet animation by name
   */
  getAnimation(spriteSheet: SpriteSheetCache, animationName: string): any {
    return spriteSheet.data.animations.find(a => a.name === animationName);
  }

  /**
   * Clear sprite sheet cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    this.canvas = null;
    this.ctx = null;
    this.eventBus = null;
    this.clearCache();
  }

  /**
   * Get all loaded sprite sheets
   */
  getLoadedSpriteSheets(): Map<string, SpriteSheetCache> {
    return new Map(this.cache);
  }
}