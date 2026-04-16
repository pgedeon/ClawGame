/**
 * @clawgame/engine - AI system
 */

import { Scene, AIComponent, Transform, MovementComponent } from '../types';

export class AISystem {
  update(scene: Scene, deltaTime: number): void {
    scene.entities.forEach((entity) => {
      const ai = entity.components.get('ai') as AIComponent | undefined;
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
          break;
      }
    });
  }

  private updatePatrol(entity: { id: string; components: Map<string, any> }, ai: AIComponent, transform: Transform, deltaTime: number): void {
    if (!ai.patrolStart || !ai.patrolEnd || !ai.patrolSpeed) return;

    const movement = entity.components.get('movement') as MovementComponent | undefined;
    if (!movement) return;

    const speed = ai.patrolSpeed * deltaTime;

    const distToEnd = Math.hypot(ai.patrolEnd.x - transform.x, ai.patrolEnd.y - transform.y);
    if (distToEnd < speed) {
      const temp = ai.patrolStart;
      ai.patrolStart = ai.patrolEnd;
      ai.patrolEnd = temp;
    }

    const angle = Math.atan2(ai.patrolEnd.y - transform.y, ai.patrolEnd.x - transform.x);
    movement.vx = Math.cos(angle) * speed * 60;
    movement.vy = Math.sin(angle) * speed * 60;
  }

  private updateChase(scene: Scene, entity: { id: string; components: Map<string, any> }, ai: AIComponent, transform: Transform, deltaTime: number): void {
    if (!ai.targetEntity) return;

    const target = scene.entities.get(ai.targetEntity);
    if (!target) return;

    const movement = entity.components.get('movement') as MovementComponent | undefined;
    if (!movement) return;

    const speed = (ai.speed ?? 50) * deltaTime;

    const angle = Math.atan2(target.transform.y - transform.y, target.transform.x - transform.x);
    movement.vx = Math.cos(angle) * speed * 60;
    movement.vy = Math.sin(angle) * speed * 60;
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    // No cleanup required for AI system
  }
}