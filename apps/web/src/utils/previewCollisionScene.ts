import type {
  CollectibleComponent,
  CollisionComponent,
  Entity,
  Scene,
  StatsComponent,
  TriggerComponent,
} from '@clawgame/engine';

export interface PreviewCollisionEntity {
  id: string;
  type: string;
  width: number;
  height: number;
  damage?: number;
  transform: {
    x: number;
    y: number;
  };
  components?: Record<string, any>;
}

function toTopLeft(entity: PreviewCollisionEntity) {
  return {
    x: entity.transform.x - entity.width / 2,
    y: entity.transform.y - entity.height / 2,
  };
}

function buildCollisionComponent(entity: PreviewCollisionEntity): CollisionComponent | null {
  switch (entity.type) {
    case 'player':
      return { width: entity.width, height: entity.height, type: 'player' };
    case 'enemy':
      return { width: entity.width, height: entity.height, type: 'enemy' };
    case 'collectible':
    case 'health':
    case 'rune':
    case 'item':
      return { width: entity.width, height: entity.height, type: 'collectible' };
    case 'obstacle':
    case 'platform':
      return { width: entity.width, height: entity.height, type: 'wall', solid: true };
    case 'trigger':
      return { width: entity.width, height: entity.height, type: 'trigger', trigger: true };
    default:
      return null;
  }
}

function buildRuntimeEntity(entity: PreviewCollisionEntity, playerDefense: number): Entity | null {
  const collision = buildCollisionComponent(entity);
  if (!collision) return null;

  const position = toTopLeft(entity);
  const components = new Map<string, any>();
  components.set('collision', collision);

  if (entity.type === 'player') {
    const stats: StatsComponent = {
      health: 100,
      maxHealth: 100,
      defense: playerDefense,
    };
    components.set('stats', stats);
  }

  if (entity.type === 'enemy') {
    const stats: StatsComponent = {
      health: entity.components?.stats?.hp ?? entity.components?.stats?.health ?? 30,
      maxHealth: entity.components?.stats?.maxHp ?? entity.components?.stats?.maxHealth ?? 30,
      attackPower: entity.damage ?? entity.components?.stats?.damage ?? entity.components?.stats?.attackPower ?? 10,
    };
    components.set('stats', stats);
    if (entity.components?.ai) {
      components.set('ai', entity.components.ai);
    }
  }

  if (entity.type === 'item' && entity.components?.itemDrop) {
    const item: CollectibleComponent = {
      type: 'item',
      value: entity.components.itemDrop.value ?? 10,
      name: entity.components.itemDrop.name ?? entity.components.itemDrop.itemId,
    };
    components.set('collectible', item);
  } else if (collision.type === 'collectible' && entity.components?.collectible) {
    const collectible: CollectibleComponent = {
      type: entity.components.collectible.type ?? 'coin',
      value: entity.components.collectible.value,
      name: entity.components.collectible.name,
    };
    components.set('collectible', collectible);
  }

  if (collision.type === 'trigger' && entity.components?.trigger) {
    const trigger: TriggerComponent = {
      onEnter: entity.components.trigger.onEnter,
      onExit: entity.components.trigger.onExit,
      onStay: entity.components.trigger.onStay,
      condition: entity.components.trigger.condition,
      event: entity.components.trigger.event,
      target: entity.components.trigger.target,
      once: entity.components.trigger.once,
    };
    components.set('trigger', trigger);
  }

  return {
    id: entity.id,
    type: entity.type as any,
    transform: position,
    components,
  };
}

export function createPreviewCollisionScene(
  entities: Iterable<PreviewCollisionEntity>,
  playerDefense = 0,
): Scene {
  const runtimeEntities = new Map<string, Entity>();

  for (const entity of entities) {
    const runtimeEntity = buildRuntimeEntity(entity, playerDefense);
    if (runtimeEntity) {
      runtimeEntities.set(runtimeEntity.id, runtimeEntity);
    }
  }

  return {
    name: 'preview-collision-scene',
    entities: runtimeEntities,
  };
}
