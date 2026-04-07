/**
 * @clawgame/engine - AI system
 */

import { Scene } from '../types';
import { AI, Transform, Movement } from '../types';

export class AISystem {
  /**
   * Update all entities with AI component
   */
  update(scene: Scene, deltaTime: number): void {
    scene.entities.forEach((entity) => {
      const ai = entity.components.get('ai') as AI | undefined;
      const transform = entity.transform;

      if (!ai || !transform) return;

      switch (ai.type) {
        case 'patrol':
          this.updatePatrol(entity, ai, transform, deltaTime);
          break;
        case 'chase':
          this.updateChase(scene, entity, ai, transform, deltaTime);
          break;
        case 'idle':
          // Do nothing
          break;
      }
    });
  }

  /**
   * Update patrol behavior
   */
  private updatePatrol(entity: { id: string; components: Map<string, any> }, ai: AI, transform: Transform, deltaTime: number): void {
    if (!ai.patrolStart || !ai.patrolEnd || !ai.patrolSpeed) return;

    const movement = entity.components.get('movement') as Movement | undefined;
    if (!movement) return;

    const speed = ai.patrolSpeed * deltaTime;

    // Check if near patrol end point
    const distToEnd = Math.hypot(ai.patrolEnd.x - transform.x, ai.patrolEnd.y - transform.y);
    if (distToEnd < speed) {
      // Swap start and end
      const temp = ai.patrolStart;
      ai.patrolStart = ai.patrolEnd;
      ai.patrolEnd = temp;
    }

    // Move towards target
    const angle = Math.atan2(ai.patrolEnd.y - transform.y, ai.patrolEnd.x - transform.x);
    movement.vx = Math.cos(angle) * speed * 60; // Normalize to 60 FPS
    movement.vy = Math.sin(angle) * speed * 60;
  }

  /**
   * Update chase behavior
   */
  private updateChase(scene: Scene, entity: { id: string; components: Map<string, any> }, ai: AI, transform: Transform, deltaTime: number): void {
    if (!ai.targetEntity) return;

    const target = scene.entities.get(ai.targetEntity);
    if (!target) return;

    const movement = entity.components.get('movement') as Movement | undefined;
    if (!movement) return;

    const speed = 50 * deltaTime; // Default chase speed

    // Move towards target
    const angle = Math.atan2(target.transform.y - transform.y, target.transform.x - transform.x);
    movement.vx = Math.cos(angle) * speed * 60;
    movement.vy = Math.sin(angle) * speed * 60;
  }
}
