import type { EquipmentSlots, Item, LearnedSpell, Quest } from '../rpg/types';
import type { PreviewProjectile } from './previewProjectileScene';
import type { TowerDefenseState, TowerDefenseTower } from './previewTowerDefense';

export interface PreviewReplayEntitySnapshot {
  id: string;
  type: string;
  width: number;
  height: number;
  transform: {
    x: number;
    y: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
  };
  components?: Record<string, any>;
  color?: string;
  health?: number;
  maxHealth?: number;
  damage?: number;
  tdSpeed?: number;
  enemyType?: string;
  patrolOrigin?: { x: number; y: number };
  patrolOffset?: number;
  hitFlash?: number;
  facing?: string;
  scoreValue?: number;
}

export interface PreviewReplayInventorySnapshot {
  items: Item[];
  equipment: EquipmentSlots;
}

export interface PreviewReplayRuntimeSnapshot {
  projectiles: PreviewProjectile[];
  towers: TowerDefenseTower[];
  tdState?: TowerDefenseState;
  collectedRuneIds: string[];
  defeatedEnemies: string[];
  invincibleTimer: number;
  lastShotTime: number;
  inventory: PreviewReplayInventorySnapshot;
  quests: Quest[];
  learnedSpells: LearnedSpell[];
  dialogueFlags: Record<string, boolean>;
}

export interface RestorePreviewReplayStateResult {
  score: number;
  health: number;
  mana: number;
  gameTime: number;
  lastShotTime: number;
  invincibleTimer: number;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clonePoint(point?: { x: number; y: number }) {
  return point ? { x: point.x, y: point.y } : undefined;
}

export function clonePreviewReplayEntity(entity: PreviewReplayEntitySnapshot): PreviewReplayEntitySnapshot {
  return {
    id: entity.id,
    type: entity.type,
    width: entity.width,
    height: entity.height,
    transform: {
      x: entity.transform.x,
      y: entity.transform.y,
      ...(entity.transform.scaleX !== undefined ? { scaleX: entity.transform.scaleX } : {}),
      ...(entity.transform.scaleY !== undefined ? { scaleY: entity.transform.scaleY } : {}),
      ...(entity.transform.rotation !== undefined ? { rotation: entity.transform.rotation } : {}),
    },
    ...(entity.components ? { components: cloneJsonValue(entity.components) } : {}),
    ...(entity.color !== undefined ? { color: entity.color } : {}),
    ...(entity.health !== undefined ? { health: entity.health } : {}),
    ...(entity.maxHealth !== undefined ? { maxHealth: entity.maxHealth } : {}),
    ...(entity.damage !== undefined ? { damage: entity.damage } : {}),
    ...(entity.tdSpeed !== undefined ? { tdSpeed: entity.tdSpeed } : {}),
    ...(entity.enemyType !== undefined ? { enemyType: entity.enemyType } : {}),
    ...(entity.patrolOrigin ? { patrolOrigin: clonePoint(entity.patrolOrigin) } : {}),
    ...(entity.patrolOffset !== undefined ? { patrolOffset: entity.patrolOffset } : {}),
    ...(entity.hitFlash !== undefined ? { hitFlash: entity.hitFlash } : {}),
    ...(entity.facing !== undefined ? { facing: entity.facing } : {}),
    ...(entity.scoreValue !== undefined ? { scoreValue: entity.scoreValue } : {}),
  };
}

export function clonePreviewReplayRuntimeSnapshot(
  runtime: PreviewReplayRuntimeSnapshot,
): PreviewReplayRuntimeSnapshot {
  return {
    projectiles: runtime.projectiles.map((projectile) => cloneJsonValue(projectile)),
    towers: runtime.towers.map((tower) => cloneJsonValue(tower)),
    ...(runtime.tdState ? { tdState: cloneJsonValue(runtime.tdState) } : {}),
    collectedRuneIds: [...runtime.collectedRuneIds],
    defeatedEnemies: [...runtime.defeatedEnemies],
    invincibleTimer: runtime.invincibleTimer,
    lastShotTime: runtime.lastShotTime,
    inventory: cloneJsonValue(runtime.inventory),
    quests: cloneJsonValue(runtime.quests),
    learnedSpells: cloneJsonValue(runtime.learnedSpells),
    dialogueFlags: cloneJsonValue(runtime.dialogueFlags),
  };
}

export function restorePreviewReplayState(
  snapshot: {
    t: number;
    entities: PreviewReplayEntitySnapshot[];
    stats: Record<string, number>;
    runtime?: PreviewReplayRuntimeSnapshot;
  },
  {
    entities,
    projectiles,
    towers,
    tdState,
    collectedRuneIds,
    defeatedEnemies,
  }: {
    entities: Map<string, any>;
    projectiles: PreviewProjectile[];
    towers: TowerDefenseTower[];
    tdState: TowerDefenseState;
    collectedRuneIds: string[];
    defeatedEnemies: string[];
  },
): RestorePreviewReplayStateResult & {
  inventory?: PreviewReplayInventorySnapshot;
  quests?: Quest[];
  learnedSpells?: LearnedSpell[];
  dialogueFlags?: Record<string, boolean>;
} {
  entities.clear();
  for (const entity of snapshot.entities) {
    const restored = clonePreviewReplayEntity(entity);
    entities.set(restored.id, restored);
  }

  projectiles.splice(
    0,
    projectiles.length,
    ...(snapshot.runtime?.projectiles.map((projectile) => cloneJsonValue(projectile)) ?? []),
  );

  towers.splice(
    0,
    towers.length,
    ...(snapshot.runtime?.towers.map((tower) => cloneJsonValue(tower)) ?? []),
  );

  if (snapshot.runtime?.tdState) {
    Object.assign(tdState, cloneJsonValue(snapshot.runtime.tdState));
  }

  collectedRuneIds.splice(
    0,
    collectedRuneIds.length,
    ...(snapshot.runtime?.collectedRuneIds ?? []),
  );

  defeatedEnemies.splice(
    0,
    defeatedEnemies.length,
    ...(snapshot.runtime?.defeatedEnemies ?? []),
  );

  return {
    score: snapshot.stats.score ?? 0,
    health: snapshot.stats.health ?? 100,
    mana: snapshot.stats.mana ?? 100,
    gameTime: snapshot.t,
    lastShotTime: snapshot.runtime?.lastShotTime ?? 0,
    invincibleTimer: snapshot.runtime?.invincibleTimer ?? 0,
    ...(snapshot.runtime?.inventory ? { inventory: cloneJsonValue(snapshot.runtime.inventory) } : {}),
    ...(snapshot.runtime?.quests ? { quests: cloneJsonValue(snapshot.runtime.quests) } : {}),
    ...(snapshot.runtime?.learnedSpells ? { learnedSpells: cloneJsonValue(snapshot.runtime.learnedSpells) } : {}),
    ...(snapshot.runtime?.dialogueFlags ? { dialogueFlags: cloneJsonValue(snapshot.runtime.dialogueFlags) } : {}),
  };
}
