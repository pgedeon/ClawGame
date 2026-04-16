/**
 * @clawgame/engine - Animation system
 *
 * Updates AnimationComponent state each frame:
 * - Tracks elapsed time per entity
 * - Advances currentFrame based on frameRate
 * - Handles loop vs clamp-to-last behavior
 * - Emits 'animation:complete' for non-looping animations
 */

import { Entity, Scene, AnimationComponent } from '../types';
import { EventBus } from '../EventBus';

export class AnimationSystem {
  private elapsed: Map<string, number> = new Map();
  private eventBus: EventBus | null = null;

  /** Attach to event bus for animation:complete events */
  attach(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /** Untrack entity for animation timing */
  remove(entityId: string): void {
    this.elapsed.delete(entityId);
  }

  update(scene: Scene, deltaTime: number): void {
    for (const entity of scene.entities.values()) {
      const animation = entity.components.get('animation') as AnimationComponent | undefined;
      if (!animation || !animation.frames || animation.frames.length === 0) continue;

      const currentElapsed = this.elapsed.get(entity.id) || 0;
      const newElapsed = currentElapsed + deltaTime;

      // Simple animation progress: advance one frame per interval
      const frameDuration = 1 / (animation.frameRate || 10);
      const frameIndex = Math.floor(newElapsed / frameDuration);

      // Track active state
      const active = animation.active !== false;
      if (!active) continue;

      // Advance frame, handling loop vs end behavior
      if (frameIndex < animation.frames.length) {
        animation.currentFrame = frameIndex;
      } else {
        // Handle animation completion
        if (!animation.loop) {
          animation.currentFrame = animation.frames.length - 1;
          animation.active = false;
          this.eventBus?.emit('animation:complete', {
            entityId: entity.id,
            entityName: entity.type,
            animation: {
              frames: animation.frames,
              frameRate: animation.frameRate,
              loop: animation.loop,
            },
          });
        } else {
          // Loop animation: reset elapsed time and start from beginning
          const loops = Math.floor(newElapsed / (frameDuration * animation.frames.length));
          const localElapsed = newElapsed - loops * frameDuration * animation.frames.length;
          const localFrameIndex = Math.floor(localElapsed / frameDuration);
          animation.currentFrame = localFrameIndex;
        }
      }

      // Track elapsed time for this entity
      this.elapsed.set(entity.id, newElapsed);
    }
  }

  /** Reset animation system state */
  reset(): void {
    this.elapsed.clear();
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    this.reset();
    this.eventBus = null;
  }

  /**
   * Destroy method for compatibility
   */
  destroy(): void {
    this.reset();
    this.eventBus = null;
  }
}