/**
 * @clawgame/engine - Physics system
 *
 * Applies gravity, friction, and simple AABB collision response
 * using PhysicsComponent and CollisionComponent data.
 */

import { Scene, Entity, PhysicsComponent, Transform, MovementComponent, CollisionComponent } from '../types';

const DEFAULT_GRAVITY = 980; // pixels/s²
const DEFAULT_FRICTION = 0.85;
const DEFAULT_BOUNCE = 0.3;

export class PhysicsSystem {
  private worldBounds: { width: number; height: number };

  constructor(worldBounds = { width: 800, height: 600 }) {
    this.worldBounds = worldBounds;
  }

  setWorldBounds(bounds: { width: number; height: number }): void {
    this.worldBounds = bounds;
  }

  update(scene: Scene, deltaTime: number): void {
    const staticBodies: Entity[] = [];
    const dynamicBodies: Entity[] = [];

    // Classify entities
    scene.entities.forEach((entity) => {
      if (!entity.components.has('collision')) return;
      if (entity.components.has('physics')) {
        dynamicBodies.push(entity);
      } else if (entity.components.has('movement')) {
        // Any moving collision body can be pushed out of static geometry.
        dynamicBodies.push(entity);
      } else if (!entity.components.has('movement')) {
        staticBodies.push(entity);
      }
    });

    // Apply physics to dynamic bodies
    for (const entity of dynamicBodies) {
      this.applyPhysics(entity, deltaTime);
    }

    // Resolve static collisions for dynamic bodies
    for (const entity of dynamicBodies) {
      for (const wall of staticBodies) {
        this.resolveStaticCollision(entity, wall);
      }
    }

    // Clamp to world bounds
    for (const entity of dynamicBodies) {
      this.clampToWorldBounds(entity);
    }
  }

  private applyPhysics(entity: Entity, deltaTime: number): void {
    const physics = entity.components.get('physics') as PhysicsComponent | undefined;
    const movement = entity.components.get('movement') as MovementComponent | undefined;
    const transform = entity.transform;

    if (!transform) return;

    // Apply gravity
    if (physics?.gravity !== undefined) {
      if (!movement) return;
      movement.vy += physics.gravity * deltaTime;
      physics.grounded = false;
    }

    // Apply friction to horizontal velocity
    if (physics?.friction !== undefined && movement) {
      const friction = physics.friction;
      if (movement.vx !== 0) {
        movement.vx *= friction;
        if (Math.abs(movement.vx) < 0.5) movement.vx = 0;
      }
    }

    // Apply velocity to position (handled by MovementSystem for player entities,
    // but physics-driven entities need it here)
    if (movement && !entity.components.has('playerInput')) {
      transform.x += movement.vx * deltaTime;
      transform.y += movement.vy * deltaTime;
    }
  }

  private resolveStaticCollision(dynamic: Entity, statik: Entity): void {
    const dCollision = dynamic.components.get('collision') as CollisionComponent | undefined;
    const sCollision = statik.components.get('collision') as CollisionComponent | undefined;
    const dTransform = dynamic.transform;
    const sTransform = statik.transform;

    if (!dCollision || !sCollision || !dTransform || !sTransform) return;

    // AABB overlap test
    const overlap = this.getAABBOverlap(
      { x: dTransform.x, y: dTransform.y, w: dCollision.width, h: dCollision.height },
      { x: sTransform.x, y: sTransform.y, w: sCollision.width, h: sCollision.height },
    );

    if (!overlap) return;

    const physics = dynamic.components.get('physics') as PhysicsComponent | undefined;
    const movement = dynamic.components.get('movement') as MovementComponent | undefined;
    const bounce = physics?.bounce ?? DEFAULT_BOUNCE;

    // Push out along the smallest overlap axis
    if (overlap.x < overlap.y) {
      // Horizontal push
      const sign = dTransform.x < sTransform.x ? -1 : 1;
      dTransform.x += sign * overlap.x;
      if (movement) movement.vx = -movement.vx * bounce;
    } else {
      // Vertical push
      const sign = dTransform.y < sTransform.y ? -1 : 1;
      dTransform.y += sign * overlap.y;
      if (movement) movement.vy = -movement.vy * bounce;

      // Grounded detection: landed on top
      if (sign === -1 && physics) {
        physics.grounded = true;
        if (movement) movement.vy = 0;
      }
    }
  }

  private getAABBOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ): { x: number; y: number } | null {
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

    if (overlapX <= 0 || overlapY <= 0) return null;
    return { x: overlapX, y: overlapY };
  }

  private clampToWorldBounds(entity: Entity): void {
    const collision = entity.components.get('collision') as CollisionComponent | undefined;
    if (!collision) return;

    const transform = entity.transform;
    const { width, height } = this.worldBounds;

    if (transform.x < 0) transform.x = 0;
    if (transform.y < 0) transform.y = 0;
    if (transform.x + collision.width > width) transform.x = width - collision.width;
    if (transform.y + collision.height > height) {
      transform.y = height - collision.height;
      const physics = entity.components.get('physics') as PhysicsComponent | undefined;
      if (physics) {
        physics.grounded = true;
        const movement = entity.components.get('movement') as MovementComponent | undefined;
        if (movement) movement.vy = 0;
      }
    }
  }
}
