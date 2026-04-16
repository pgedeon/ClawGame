import type { AIComponent, CollisionComponent, Component, Entity, InputState, MovementComponent, Scene, StatsComponent, SpriteComponent } from '@clawgame/engine';
import { createPlaceholderSprite } from './placeholderSprites';

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

  if (entity.type === 'td-enemy') {
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

function createStatsComponent(entity: PreviewRuntimeEntity): StatsComponent | null {
  if (entity.type === 'enemy' || entity.type === 'td-enemy') {
    const hp = entity.health ?? entity.components?.stats?.health ?? entity.components?.ai?.health ?? 50;
    const maxHp = entity.maxHealth ?? entity.components?.stats?.maxHealth ?? entity.components?.ai?.maxHealth ?? hp;
    if (hp <= 0) return null;
    return { 
      health: hp, 
      maxHealth: maxHp,
      attackPower: entity.components?.ai?.attackPower,
      defense: entity.components?.stats?.defense ?? 0
    };
  }
  
  // For other entity types that might have stats
  if (entity.type === 'player') {
    const hp = entity.health ?? entity.components?.stats?.health ?? 100;
    const maxHp = entity.maxHealth ?? entity.components?.stats?.maxHealth ?? hp;
    return { 
      health: hp, 
      maxHealth: maxHp,
      defense: entity.components?.stats?.defense ?? 0
    };
  }

  return null;
}

function createSpriteComponent(entity: PreviewRuntimeEntity): SpriteComponent {
  const spriteColor = entity.components?.sprite?.color;
  
  // Create placeholder image for this entity type
  const image = createPlaceholderSprite(
    entity.type,
    entity.width,
    entity.height,
    spriteColor
  );

  return {
    width: entity.width,
    height: entity.height,
    image,
    color: spriteColor,
    offsetX: 0,
    offsetY: 0,
  };
}

function createAIComponent(entity: PreviewRuntimeEntity): AIComponent | null {
  if (entity.type === 'enemy' || entity.type === 'td-enemy') {
    const ai = entity.components?.ai || {};
    return {
      type: ai.type || 'patrol',
      speed: ai.speed || 50,
      health: ai.health || (entity.health || 50),
      attackPower: ai.attackPower || 10,
    };
  }
  
  return null;
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
    // Include all entity types, but focus on core ones for runtime
    if (!['player', 'enemy', 'td-enemy', 'obstacle', 'platform', 'core'].includes(entity.type)) continue;

    const movement = createMovementComponent(entity);
    const collision = createCollisionComponent(entity);
    const stats = createStatsComponent(entity);
    const sprite = createSpriteComponent(entity);
    const ai = createAIComponent(entity);
    
    if (!movement && !collision && !stats && !ai) continue;

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
    if (ai) {
      components.set('ai', ai);
    }
    components.set('sprite', sprite);

    const runtimeEntity: Entity = {
      id: entity.id,
      type: entity.type as any,
      transform: toTopLeft(entity),
      components,
    };

    runtimeEntities.set(entity.id, runtimeEntity);
  }

  return {
    name: 'preview-scene',
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