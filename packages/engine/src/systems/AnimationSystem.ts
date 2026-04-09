/**
 * @clawgame/engine - Animation system
 *
 * Updates AnimationComponent state each frame:
 * - Tracks elapsed time per entity
 * - Advances currentFrame based on frameRate
 * - Handles loop vs clamp-to-last behavior
 * - Emits 'animation:complete' for non-looping animations
 */

import { Entity, Scene } from '../types';
import { EventBus } from '../EventBus';

export class AnimationSystem {
  private elapsed: Map<string, number> = new Map();
  private eventBus: EventBus | null = null;

  /** Attach to event bus for animation:complete events */
  attach(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(scene: Scene, deltaTime: number): void {
    scene.entities.forEach((entity) => {
      this.updateEntity(entity, deltaTime);
    });
  }

  private updateEntity(entity: Entity, deltaTime: number): void {
    const anim = entity.components.get('animation');
    if (!anim || !('frames' in anim)) return;

    const frames = anim.frames as string[];
    const frameRate = (anim as any).frameRate as number ?? 10;
    const loop = (anim as any).loop as boolean ?? true;

    if (frames.length === 0) return;
    if (frames.length === 1) {
      (anim as any).currentFrame = 0;
      return;
    }

    const key = entity.id;
    const prev = this.elapsed.get(key) ?? 0;
    const total = prev + deltaTime;
    const frameDuration = 1 / frameRate;

    const currentFrame = (anim as any).currentFrame as number ?? 0;
    const newElapsed = total;

    // How many frame advances?
    const framesAdvanced = Math.floor(newElapsed / frameDuration);
    if (framesAdvanced > 0) {
      let next = currentFrame + framesAdvanced;
      if (loop) {
        next = next % frames.length;
      } else {
        if (next >= frames.length - 1) {
          next = frames.length - 1;
          this.eventBus?.emit('animation:complete', {
            entityId: entity.id,
            entityName: entity.name,
            animation: { frames, frameRate, loop },
          });
        }
      }
      (anim as any).currentFrame = next;
      this.elapsed.set(key, newElapsed - framesAdvanced * frameDuration);
    } else {
      this.elapsed.set(key, newElapsed);
    }
  }

  /** Reset animation state for a specific entity (e.g., on scene reload) */
  resetEntity(entityId: string): void {
    this.elapsed.delete(entityId);
  }

  /** Reset all tracked state */
  reset(): void {
    this.elapsed.clear();
  }

  destroy(): void {
    this.elapsed.clear();
    this.eventBus = null;
  }
}
