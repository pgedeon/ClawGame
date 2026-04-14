import type { CollisionComponent, Component, Entity, ProjectileComponent, Scene } from '@clawgame/engine';

export interface PreviewProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color?: string;
  createdAt?: number;
  isSpell?: boolean;
}

export interface PreviewProjectileTarget {
  id: string;
  type: string;
  width: number;
  height: number;
  transform: {
    x: number;
    y: number;
  };
}

function getProjectileSize(projectile: PreviewProjectile): number {
  return projectile.isSpell ? 14 : 10;
}

function toProjectileTopLeft(projectile: PreviewProjectile) {
  const size = getProjectileSize(projectile);
  return {
    x: projectile.x - size / 2,
    y: projectile.y - size / 2,
  };
}

function toTargetTopLeft(target: PreviewProjectileTarget) {
  return {
    x: target.transform.x - target.width / 2,
    y: target.transform.y - target.height / 2,
  };
}

function createTargetCollision(target: PreviewProjectileTarget): CollisionComponent | null {
  if (target.type === 'enemy') {
    return {
      width: target.width,
      height: target.height,
      type: 'enemy',
    };
  }

  if (target.type === 'obstacle' || target.type === 'platform') {
    return {
      width: target.width,
      height: target.height,
      type: 'wall',
      solid: true,
    };
  }

  return null;
}

export function createPreviewProjectileScene(
  projectiles: Iterable<PreviewProjectile>,
  targets: Iterable<PreviewProjectileTarget>,
): Scene {
  const runtimeEntities = new Map<string, Entity>();

  for (const projectile of projectiles) {
    if (projectile.id.startsWith('tp-')) continue;

    const size = getProjectileSize(projectile);
    const projectileComponent: ProjectileComponent = {
      vx: projectile.vx,
      vy: projectile.vy,
      damage: projectile.damage,
      targetTypes: ['enemy', 'wall'],
    };
    const components = new Map<string, Component>();
    components.set('projectile', projectileComponent);
    components.set('collision', {
      width: size,
      height: size,
      type: 'projectile',
    });

    runtimeEntities.set(projectile.id, {
      id: projectile.id,
      type: 'projectile',
      transform: toProjectileTopLeft(projectile),
      components,
    });
  }

  for (const target of targets) {
    const collision = createTargetCollision(target);
    if (!collision) continue;

    runtimeEntities.set(target.id, {
      id: target.id,
      type: target.type as any,
      transform: toTargetTopLeft(target),
      components: new Map<string, Component>([['collision', collision]]),
    });
  }

  return {
    name: 'preview-projectile-scene',
    entities: runtimeEntities,
  };
}

export function applyPreviewProjectileScene(scene: Scene, projectiles: PreviewProjectile[]): void {
  const runtimeProjectiles = new Map(
    Array.from(scene.entities.values())
      .filter((entity) => entity.type === 'projectile')
      .map((entity) => [entity.id, entity]),
  );

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    if (projectile.id.startsWith('tp-')) continue;

    const runtimeProjectile = runtimeProjectiles.get(projectile.id);

    if (!runtimeProjectile) {
      projectiles.splice(i, 1);
      continue;
    }

    const size = getProjectileSize(projectile);
    projectile.x = runtimeProjectile.transform.x + size / 2;
    projectile.y = runtimeProjectile.transform.y + size / 2;

    const projectileComponent = runtimeProjectile.components.get('projectile') as ProjectileComponent | undefined;
    if (projectileComponent) {
      projectile.vx = projectileComponent.vx;
      projectile.vy = projectileComponent.vy;
      projectile.damage = projectileComponent.damage;
    }
  }
}
