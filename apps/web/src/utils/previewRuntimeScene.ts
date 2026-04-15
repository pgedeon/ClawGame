import type { AIComponent, CollisionComponent, Component, Entity, InputState, MovementComponent, Scene, StatsComponent } from '@clawgame/engine';

export interface PreviewRuntimeEntity {
  id: string;
  type: string;
  width: number;
  height: number;
  transform: {
    x: number;
    y: number;
  };
  components?: Record<string, any>;
  patrolOrigin?: { x: number; y: number };
  facing?: string;
  health?: number;
  maxHealth?: number;
}

function toTopLeft(entity: PreviewRuntimeEntity) {
  return {
    x: entity.transform.x - entity.width / 2,
    y: entity.transform.y - entity.height / 2,
  };
}

function toCenter(entity: PreviewRuntimeEntity, runtimeEntity: Entity) {
  entity.transform.x = runtimeEntity.transform.x + entity.width / 2;
  entity.transform.y = runtimeEntity.transform.y + entity.height / 2;
}

function createMovementComponent(entity: PreviewRuntimeEntity): MovementComponent | null {
  if (entity.type === 'player') {
    return {
      vx: 0,
      vy: 0,
      speed: entity.components?.movement?.speed ?? 200,
    };
  }

  if (entity.type === 'enemy') {
    return {
      vx: 0,
      vy: 0,
      speed: entity.components?.ai?.speed ?? 50,
    };
  }

  return null;
}

function createCollisionComponent(entity: PreviewRuntimeEntity): CollisionComponent | null {
  if (entity.type === 'player') {
    return {
      width: entity.width,
      height: entity.height,
      type: 'player',
    };
  }

  if (entity.type === 'enemy') {
    return {
      width: entity.width,
      height: entity.height,
      type: 'enemy',
    };
  }

  if (entity.type === 'obstacle' || entity.type === 'platform') {
    return {
      width: entity.width,
      height: entity.height,
      type: 'wall',
      solid: true,
    };
  }

  return null;
}

function createEnemyAIComponent(
  entity: PreviewRuntimeEntity,
  playerId: string | undefined,
  player: PreviewRuntimeEntity | undefined,
): AIComponent | null {
  if (!playerId || !player) return null;

  const speed = entity.components?.ai?.speed ?? 50;
  const dx = player.transform.x - entity.transform.x;
  const dy = player.transform.y - entity.transform.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const range = entity.components?.ai?.range ?? 200;

  if (distance <= range) {
    return {
      type: 'chase',
      targetEntity: playerId,
      speed,
      range,
    };
  }

  const origin = entity.patrolOrigin ?? { x: entity.transform.x, y: entity.transform.y };
  const travel = 100;
  return {
    type: 'patrol',
    patrolStart: { x: origin.x - travel - entity.width / 2, y: origin.y - entity.height / 2 },
    patrolEnd: { x: origin.x + travel - entity.width / 2, y: origin.y - entity.height / 2 },
    patrolSpeed: speed,
    speed,
    range,
  };
}

function createStatsComponent(entity: PreviewRuntimeEntity): StatsComponent | null {
  if (entity.type !== 'enemy') return null;
  const hp = entity.health ?? entity.components?.stats?.health ?? 50;
  const maxHp = entity.maxHealth ?? entity.components?.stats?.maxHealth ?? hp;
  if (hp <= 0) return null;
  return { health: hp, maxHealth: maxHp };
}

export function createPreviewRuntimeScene(
  entities: Iterable<PreviewRuntimeEntity>,
  options: {
    isTowerDefense?: boolean;
  } = {},
): Scene {
  const runtimeEntities = new Map<string, Entity>();
  const previewEntities = Array.from(entities);
  const player = previewEntities.find((entity) => entity.type === 'player');
  const playerId = player?.id;

  for (const entity of previewEntities) {
    if (!['player', 'enemy', 'obstacle', 'platform'].includes(entity.type)) continue;
    if (options.isTowerDefense && entity.type === 'enemy') continue;

    const movement = createMovementComponent(entity);
    const collision = createCollisionComponent(entity);
    const stats = createStatsComponent(entity);
    if (!movement && !collision && !stats) continue;

    const components = new Map<string, Component>();
    if (movement) {
      components.set('movement', movement);
    }
    if (collision) {
      components.set('collision', collision);
    }
    if (stats) {
      components.set('stats', stats);
    }

    const runtimeEntity: Entity = {
      id: entity.id,
      type: entity.type as any,
      transform: toTopLeft(entity),
      components,
    };

    if (entity.type === 'player') {
      runtimeEntity.components.set('playerInput', {});
    }

    if (entity.type === 'enemy') {
      const ai = createEnemyAIComponent(entity, playerId, player);
      if (ai) {
        runtimeEntity.components.set('ai', ai);
      }
    }

    runtimeEntities.set(runtimeEntity.id, runtimeEntity);
  }

  return {
    name: 'preview-runtime-scene',
    entities: runtimeEntities,
  };
}

export function applyPreviewRuntimeScene(runtimeScene: Scene, entities: Map<string, PreviewRuntimeEntity>): void {
  for (const runtimeEntity of runtimeScene.entities.values()) {
    const previewEntity = entities.get(runtimeEntity.id);
    if (!previewEntity) continue;

    toCenter(previewEntity, runtimeEntity);

    const movement = runtimeEntity.components.get('movement') as MovementComponent | undefined;
    if (movement?.vx) {
      previewEntity.facing = movement.vx > 0 ? 'right' : movement.vx < 0 ? 'left' : previewEntity.facing;
    }

    // Sync health from engine StatsComponent back to preview entity
    const stats = runtimeEntity.components.get('stats') as StatsComponent | undefined;
    if (stats && previewEntity.health !== undefined) {
      previewEntity.health = stats.health;
    }
  }
}

export function toEngineInputState(keys: Record<string, boolean>): InputState {
  return {
    left: Boolean(keys.arrowleft || keys.a),
    right: Boolean(keys.arrowright || keys.d),
    up: Boolean(keys.arrowup || keys.w),
    down: Boolean(keys.arrowdown || keys.s),
  };
}
