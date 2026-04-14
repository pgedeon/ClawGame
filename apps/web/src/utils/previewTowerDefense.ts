export interface TowerDefenseEnemyGroup { type?: string; enemyType?: string; count: number; hp?: number; speed?: number; color?: string; size?: number; score?: number; damage?: number; }
export interface TowerDefenseWave { enemies: TowerDefenseEnemyGroup[]; delay?: number; message?: string; }

export type TowerType = 'basic' | 'cannon' | 'frost' | 'lightning';
export type MapLayout = 'coffee-run' | 'circuit-board';

export interface TowerConfig {
  damage: number;
  range: number;
  fireRate: number; // ms
  cost: number;
  color: string;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  basic:     { damage: 15, range: 150, fireRate: 800,  cost: 30, color: '#D2691E' },
  cannon:    { damage: 35, range: 130, fireRate: 1500, cost: 50, color: '#6b7280', splashRadius: 60 },
  frost:     { damage: 10, range: 160, fireRate: 900,  cost: 40, color: '#60a5fa', slowAmount: 0.5, slowDuration: 2000 },
  lightning: { damage: 20, range: 140, fireRate: 1200, cost: 55, color: '#fbbf24', chainCount: 3, chainRange: 100 },
};

export const TOWER_TYPE_ORDER: TowerType[] = ['basic', 'cannon', 'frost', 'lightning'];

export const TOWER_DISPLAY: Record<TowerType, { icon: string; name: string }> = {
  basic: { icon: '☕', name: 'Basic' },
  cannon: { icon: '💣', name: 'Cannon' },
  frost: { icon: '❄️', name: 'Frost' },
  lightning: { icon: '⚡', name: 'Lightning' },
};

export type TowerDefenseOverlayFeedbackKind = 'error' | 'info' | 'success';

export interface TowerDefenseOverlayState {
  enabled: boolean;
  selectedTowerType: TowerType;
  feedback: {
    message: string;
    kind: TowerDefenseOverlayFeedbackKind;
  } | null;
}

export const DEFAULT_TOWER_DEFENSE_OVERLAY_STATE: TowerDefenseOverlayState = {
  enabled: false,
  selectedTowerType: 'basic',
  feedback: null,
};

export const TOWER_PLACEMENT_RADIUS = 18;

export interface TowerDefenseTower {
  id: string;
  x: number;
  y: number;
  range: number;
  damage: number;
  fireRate: number;
  lastShot: number;
  color: string;
  upgradeLevel: number;
  baseCost: number;
  towerType: TowerType;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
}

export const TOWER_BASE_COST = 30;
export const MAX_UPGRADE_LEVEL = 3;

export interface TowerDefenseProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color?: string;
  createdAt?: number;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface TowerDefenseEntity {
  id: string;
  type: string;
  width: number;
  height: number;
  transform: { x: number; y: number; scaleX?: number; scaleY?: number; rotation?: number; };
  components?: Record<string, any>;
  color?: string;
  health?: number;
  maxHealth?: number;
  damage?: number;
  tdSpeed?: number;
  enemyType?: string;
  hitFlash?: number;
  facing?: string;
  scoreValue?: number;
  slowedUntil?: number;
  currentWaypointIndex?: number;
}

export type TowerDefenseGamePhase = 'idle' | 'waiting' | 'active' | 'gameover' | 'victory';

export interface TowerDefenseState {
  waveCountdown: number; // seconds until next wave (-1 = not counting)
  mapLayout: MapLayout;
  waypoints: Waypoint[];
  waveIndex: number;
  waveTimer: number;
  spawnQueue: TowerDefenseEnemyGroup[];
  spawnTimer: number;
  coreHealth: number;
  maxCoreHealth: number;
  waveMessage: string;
  waveMessageTimer: number;
  enemiesAlive: number;
  allWavesDone: boolean;
  enemyIdCounter: number;
  waitingForPlayer: boolean;
  gamePhase: TowerDefenseGamePhase;
}

export interface UpdateTowerDefenseFrameOptions {
  canvasWidth: number;
  canvasHeight: number;
  currentTime: number;
  deltaTime: number;
  entities: Map<string, TowerDefenseEntity>;
  towers: TowerDefenseTower[];
  projectiles: TowerDefenseProjectile[];
  state: TowerDefenseState;
  waves: TowerDefenseWave[];
  onEnemyDefeated?: (enemy: TowerDefenseEntity, manaReward: number) => void;
  random?: () => number;
}

export interface TowerDefenseUpdateResult {
  gameOver: boolean;
  victory: boolean;
}

export const DEFAULT_TOWER_DEFENSE_WAVES: TowerDefenseWave[] = [
  { enemies: [
    { type: 'intern', count: 6, hp: 30, speed: 75, color: '#86efac', size: 22, score: 10, damage: 10 },
  ], delay: 1000, message: '☕ Wave 1: Interns smell fresh coffee...' },
  { enemies: [
    { type: 'intern', count: 4, hp: 35, speed: 85, color: '#86efac', size: 22, score: 10, damage: 10 },
    { type: 'manager', count: 4, hp: 70, speed: 55, color: '#fbbf24', size: 28, score: 25, damage: 10 },
  ], delay: 1000, message: '📋 Wave 2: Middle management incoming!' },
  { enemies: [
    { type: 'manager', count: 6, hp: 85, speed: 60, color: '#fbbf24', size: 28, score: 25, damage: 10 },
    { type: 'it-guy', count: 2, hp: 50, speed: 130, color: '#60a5fa', size: 24, score: 30, damage: 12 },
  ], delay: 1000, message: '💻 Wave 3: IT detected caffeine on the network!' },
  { enemies: [
    { type: 'it-guy', count: 3, hp: 60, speed: 140, color: '#60a5fa', size: 24, score: 30, damage: 12 },
    { type: 'trojan', count: 5, hp: 150, speed: 45, color: '#fb923c', size: 32, score: 50, damage: 15 },
  ], delay: 1000, message: '🛡️ Wave 4: Tanky trojans with IT support!' },
  { enemies: [
    { type: 'ceo', count: 1, hp: 500, speed: 35, color: '#f43f5e', size: 44, score: 200, damage: 25 },
    { type: 'manager', count: 4, hp: 100, speed: 65, color: '#fbbf24', size: 28, score: 25, damage: 10 },
    { type: 'it-guy', count: 3, hp: 65, speed: 135, color: '#60a5fa', size: 24, score: 30, damage: 12 },
  ], delay: 1000, message: '🔥 Wave 5: THE CEO WANTS A TRIPLE SOY LATTE!' },
];

export const CIRCUIT_BOARD_WAVES: TowerDefenseWave[] = [
  { enemies: [{ type: 'virus',   count: 6,  hp: 40, speed: 90,  color: '#f87171', size: 20, score: 15 }], delay: 3000, message: '⚡ Wave 1: Rogue processes detected!' },
  { enemies: [{ type: 'malware', count: 5,  hp: 80, speed: 70,  color: '#a78bfa', size: 26, score: 30 }], delay: 5000, message: '🦠 Wave 2: Malware spreading through registers!' },
  { enemies: [{ type: 'virus',   count: 8,  hp: 50, speed: 110, color: '#f87171', size: 20, score: 15 }, { type: 'trojan', count: 4, hp: 120, speed: 55, color: '#fb923c', size: 30, score: 50 }], delay: 7000, message: '💀 Wave 3: Trojans bypassing the firewall!' },
  { enemies: [{ type: 'rootkit', count: 3,  hp: 200, speed: 45, color: '#f43f5e', size: 34, score: 100 }, { type: 'malware', count: 6, hp: 90, speed: 75, color: '#a78bfa', size: 26, score: 30 }], delay: 9000, message: '🔓 Wave 4: Rootkit has kernel access!' },
  { enemies: [{ type: 'ransomware', count: 1, hp: 500, speed: 30, color: '#dc2626', size: 44, score: 300 }, { type: 'rootkit', count: 4, hp: 250, speed: 40, color: '#f43f5e', size: 34, score: 100 }], delay: 12000, message: '💸 Wave 5: RANSOMWARE DEMANDS 1M BITCOIN!' },
];

export function getMapWaypoints(layout: MapLayout, w: number, h: number): Waypoint[] {
  if (layout === 'circuit-board') {
    return [
      { x: 60,       y: h + 20 },   // spawn below left
      { x: 60,       y: h * 0.62 }, // go up to 62%
      { x: w * 0.5,  y: h * 0.62 }, // go right to center
      { x: w * 0.5,  y: h * 0.38 }, // go up to 38%
      { x: w - 60,   y: h * 0.38 }, // go right to right edge
      { x: w - 60,   y: 60 },        // go up to top
    ];
  }
  // These waypoints MUST match the rendered dirt-road path in legacyCanvasSession.ts
  return [
    { x: 100, y: h + 20 },        // spawn below (off-screen)
    { x: 100, y: 460 },            // turn right
    { x: 660, y: 460 },            // turn up
    { x: 660, y: 280 },            // turn left
    { x: 250, y: 280 },            // turn up
    { x: 250, y: 200 },            // turn right
    { x: 660, y: 200 },            // turn up
    { x: 660, y: 123 },            // turn left
    { x: 400, y: 123 },            // approach core
  ];
}

export function getTowerDefenseWaves(scene: { waves?: TowerDefenseWave[] }): TowerDefenseWave[] {
  return scene.waves || DEFAULT_TOWER_DEFENSE_WAVES;
}

export function getMapLayout(scene: { name?: string }): MapLayout {
  const name = scene.name || '';
  if (name.toLowerCase().includes('circuit') || name.toLowerCase().includes('level 2') || name.toLowerCase().includes('2')) {
    return 'circuit-board';
  }
  return 'coffee-run';
}

export function createTowerDefenseState(coreHealth = 0, mapLayout: MapLayout = 'coffee-run', w = 800, h = 600): TowerDefenseState {
  return {
    mapLayout,
    waypoints: getMapWaypoints(mapLayout, w, h),
    waveIndex: 0, waveTimer: 0, spawnQueue: [], spawnTimer: 0, waveCountdown: -1,
    coreHealth, maxCoreHealth: coreHealth,
    waveMessage: '', waveMessageTimer: 0,
    enemiesAlive: 0, allWavesDone: false, enemyIdCounter: 0,
    waitingForPlayer: true, gamePhase: 'waiting',
  };
}

export function getTowerDefensePathPoints(
  layout: MapLayout,
  w: number,
  h: number,
  corePosition?: { x: number; y: number } | null,
): Waypoint[] {
  const waypoints = getMapWaypoints(layout, w, h);
  if (waypoints.length === 0) {
    return corePosition ? [corePosition] : [];
  }

  if (layout === 'coffee-run') {
    const pathPoints: Waypoint[] = [
      { x: 100, y: h },
      ...waypoints.slice(1),
    ];
    if (corePosition) {
      pathPoints.push({ x: corePosition.x, y: corePosition.y });
    } else {
      pathPoints.push({ x: 400, y: 55 });
    }
    return pathPoints;
  }

  return corePosition
    ? [...waypoints, { x: corePosition.x, y: corePosition.y }]
    : waypoints;
}

export interface TowerPlacementValidationOptions {
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  towers: TowerDefenseTower[];
  mapLayout: MapLayout;
  corePosition?: { x: number; y: number } | null;
}

export interface TowerPlacementValidationResult {
  valid: boolean;
  reason?: 'bounds' | 'path' | 'overlap' | 'core';
}

function distanceFromPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const abLengthSquared = abx * abx + aby * aby;
  if (abLengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLengthSquared));
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  return Math.hypot(px - closestX, py - closestY);
}

export function validateTowerPlacement({
  x,
  y,
  canvasWidth,
  canvasHeight,
  towers,
  mapLayout,
  corePosition,
}: TowerPlacementValidationOptions): TowerPlacementValidationResult {
  const towerPadding = TOWER_PLACEMENT_RADIUS + 4;
  if (
    x < towerPadding
    || x > canvasWidth - towerPadding
    || y < towerPadding
    || y > canvasHeight - towerPadding
  ) {
    return { valid: false, reason: 'bounds' };
  }

  if (corePosition && Math.hypot(x - corePosition.x, y - corePosition.y) < 46) {
    return { valid: false, reason: 'core' };
  }

  for (const tower of towers) {
    if (Math.hypot(x - tower.x, y - tower.y) < TOWER_PLACEMENT_RADIUS * 2 + 8) {
      return { valid: false, reason: 'overlap' };
    }
  }

  const pathPoints = getTowerDefensePathPoints(mapLayout, canvasWidth, canvasHeight, corePosition);
  for (let index = 0; index < pathPoints.length - 1; index++) {
    const start = pathPoints[index];
    const end = pathPoints[index + 1];
    const distance = distanceFromPointToSegment(x, y, start.x, start.y, end.x, end.y);
    if (distance < 34) {
      return { valid: false, reason: 'path' };
    }
  }

  return { valid: true };
}

export function createTowerDefenseTowerAt(
  position: { x: number; y: number },
  type: TowerType = 'basic',
  now = Date.now(),
): TowerDefenseTower {
  const cfg = TOWER_CONFIGS[type];
  return {
    id: `tower-${now}`,
    x: position.x,
    y: position.y,
    range: cfg.range,
    damage: cfg.damage,
    fireRate: cfg.fireRate,
    lastShot: 0,
    color: cfg.color,
    upgradeLevel: 0,
    baseCost: cfg.cost,
    towerType: type,
    splashRadius: cfg.splashRadius,
    slowAmount: cfg.slowAmount,
    slowDuration: cfg.slowDuration,
    chainCount: cfg.chainCount,
    chainRange: cfg.chainRange,
  };
}

export function createTowerDefenseTower(
  player: { transform: { x: number; y: number } },
  type: TowerType = 'basic',
  now = Date.now(),
): TowerDefenseTower {
  return createTowerDefenseTowerAt(player.transform, type, now);
}

export function getUpgradeCost(tower: TowerDefenseTower): number {
  return Math.floor(tower.baseCost * 0.5);
}

export function getSellValue(tower: TowerDefenseTower): number {
  const totalInvested = tower.baseCost + tower.upgradeLevel * getUpgradeCost(tower);
  return Math.floor(totalInvested * 0.5);
}

function getTowerDefenseEnemyType(enemy?: Pick<TowerDefenseEntity, 'enemyType'> | TowerDefenseEnemyGroup | string): string {
  if (typeof enemy === 'string') return enemy;
  if (!enemy) return 'basic';
  if ('enemyType' in enemy && enemy.enemyType) return enemy.enemyType;
  if ('type' in enemy && enemy.type) return enemy.type;
  return 'basic';
}

export function getTowerDefenseEnemyManaBounty(
  enemy?: Pick<TowerDefenseEntity, 'enemyType' | 'maxHealth' | 'tdSpeed'> | TowerDefenseEnemyGroup | string,
): number {
  const enemyType = getTowerDefenseEnemyType(enemy).toLowerCase();

  switch (enemyType) {
    case 'basic':
    case 'intern':
    case 'virus':
      return 10;
    case 'fast':
    case 'it-guy':
      return 8;
    case 'tank':
    case 'manager':
    case 'malware':
    case 'trojan':
    case 'rootkit':
      return 20;
    case 'boss':
    case 'ceo':
    case 'ransomware':
      return 50;
    default: {
      const maxHealth = typeof enemy === 'string'
        ? 0
        : (enemy && 'maxHealth' in enemy && enemy.maxHealth) || (enemy && 'hp' in enemy && enemy.hp) || 0;
      const speed = typeof enemy === 'string'
        ? 0
        : (enemy && 'tdSpeed' in enemy && enemy.tdSpeed) || (enemy && 'speed' in enemy && enemy.speed) || 0;
      if (maxHealth >= 250) return 50;
      if (speed >= 115) return 8;
      if (maxHealth >= 80) return 20;
      return 10;
    }
  }
}

export function upgradeTower(tower: TowerDefenseTower): boolean {
  if (tower.upgradeLevel >= MAX_UPGRADE_LEVEL) return false;
  tower.upgradeLevel++;
  tower.damage = Math.round(tower.damage * 1.25 * 10) / 10;
  tower.range = Math.round(tower.range * 1.15);
  tower.fireRate = Math.max(200, Math.round(tower.fireRate / 1.2));
  if (tower.splashRadius) tower.splashRadius = Math.round(tower.splashRadius * 1.2);
  return true;
}

export function registerTowerDefenseEnemyDefeat(
  state: TowerDefenseState,
  enemy?: Pick<TowerDefenseEntity, 'enemyType' | 'maxHealth' | 'tdSpeed'> | TowerDefenseEnemyGroup | string,
  onBounty?: (manaReward: number) => void,
): void {
  state.enemiesAlive = Math.max(0, state.enemiesAlive - 1);

  if (enemy && onBounty) {
    const manaReward = getTowerDefenseEnemyManaBounty(enemy);
    if (manaReward > 0) onBounty(manaReward);
  }
}

type TowerDefenseProjectileEffect = {
  towerType: TowerType;
  splashRadius?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
  chainDamage?: number;
  hitIds?: Set<string>;
};

const towerDefenseProjectileEffects = new Map<string, TowerDefenseProjectileEffect>();

function isTowerDefenseProjectile(projectile: TowerDefenseProjectile): boolean {
  return projectile.id.startsWith('tp-');
}

function pruneTowerDefenseProjectileEffects(projectiles: TowerDefenseProjectile[]): void {
  const activeProjectileIds = new Set(projectiles.filter(isTowerDefenseProjectile).map((projectile) => projectile.id));
  for (const projectileId of towerDefenseProjectileEffects.keys()) {
    if (!activeProjectileIds.has(projectileId)) {
      towerDefenseProjectileEffects.delete(projectileId);
    }
  }
}

function applyTowerDefenseProjectileDamage(
  enemy: TowerDefenseEntity,
  damage: number,
  entities: Map<string, TowerDefenseEntity>,
  state: TowerDefenseState,
  onEnemyDefeated?: (enemy: TowerDefenseEntity, manaReward: number) => void,
): void {
  enemy.health = (enemy.health || 0) - damage;
  enemy.hitFlash = 300;

  if ((enemy.health || 0) <= 0) {
    const manaReward = getTowerDefenseEnemyManaBounty(enemy);
    registerTowerDefenseEnemyDefeat(state);
    if (onEnemyDefeated) {
      onEnemyDefeated(enemy, manaReward);
    }
    entities.delete(enemy.id);
  }
}

function spawnTowerDefenseProjectile(
  projectiles: TowerDefenseProjectile[],
  projectile: TowerDefenseProjectile,
  effect: TowerDefenseProjectileEffect,
): void {
  projectiles.push(projectile);
  towerDefenseProjectileEffects.set(projectile.id, effect);
}

function spawnLightningChainProjectile(
  projectiles: TowerDefenseProjectile[],
  entities: Map<string, TowerDefenseEntity>,
  impactX: number,
  impactY: number,
  currentTime: number,
  random: () => number,
  effect: TowerDefenseProjectileEffect,
): void {
  if (!effect.chainCount || effect.chainCount <= 0 || !effect.chainRange) return;

  const hitIds = new Set(effect.hitIds || []);
  let nextTarget: TowerDefenseEntity | null = null;
  let minDist = Infinity;

  for (const entity of entities.values()) {
    if (entity.type !== 'enemy' || hitIds.has(entity.id)) continue;

    const dx = entity.transform.x - impactX;
    const dy = entity.transform.y - impactY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < effect.chainRange && dist < minDist) {
      nextTarget = entity;
      minDist = dist;
    }
  }

  if (!nextTarget) return;

  const dx = nextTarget.transform.x - impactX;
  const dy = nextTarget.transform.y - impactY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nextHitIds = new Set(hitIds);
  nextHitIds.add(nextTarget.id);

  spawnTowerDefenseProjectile(projectiles, {
    id: `tp-${currentTime}-${random()}-chain-${effect.chainCount}`,
    x: impactX,
    y: impactY,
    vx: (dx / dist) * 600,
    vy: (dy / dist) * 600,
    damage: effect.chainDamage ?? 0,
    color: '#fef08a',
    createdAt: currentTime,
  }, {
    towerType: 'lightning',
    chainCount: effect.chainCount - 1,
    chainRange: effect.chainRange,
    chainDamage: effect.chainDamage,
    hitIds: nextHitIds,
  });
}

export function updateTowerDefenseFrame({
  canvasWidth, canvasHeight, currentTime, deltaTime,
  entities, towers, projectiles, state, waves, onEnemyDefeated,
  random = Math.random,
}: UpdateTowerDefenseFrameOptions): TowerDefenseUpdateResult {
  const target = entities.get('core-bean') || entities.get('magic-bean') || entities.get('player') || entities.get('player-1');
  const deltaSeconds = deltaTime / 1000;
  const pathWaypoints = target
    ? getTowerDefensePathPoints(state.mapLayout, canvasWidth, canvasHeight, target.transform)
    : state.waypoints;
  const spawnWaypointIndex = pathWaypoints.length > 1 ? 1 : 0;

  if (pathWaypoints.length > 0) {
    state.waypoints = pathWaypoints;
  }

  pruneTowerDefenseProjectileEffects(projectiles);

  // ── Enemy movement via waypoint routing ──
  for (const entity of entities.values()) {
    if (entity.type !== 'enemy') continue;

    const baseSpeed = entity.tdSpeed || entity.components?.ai?.speed || 60;
    const isSlowed = Boolean(entity.slowedUntil && entity.slowedUntil > currentTime);
    const effectiveSpeed = isSlowed ? baseSpeed * 0.5 : baseSpeed;

    let waypointIdx = entity.currentWaypointIndex ?? spawnWaypointIndex;
    let remainingDistance = effectiveSpeed * deltaSeconds;
    const arrivalRadius = 8;

    while (remainingDistance > 0) {
      const waypoint = pathWaypoints[waypointIdx];
      if (!waypoint) break;

      const dx = waypoint.x - entity.transform.x;
      const dy = waypoint.y - entity.transform.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= arrivalRadius) {
        entity.transform.x = waypoint.x;
        entity.transform.y = waypoint.y;
        waypointIdx += 1;
        continue;
      }

      const travelDistance = Math.min(remainingDistance, dist);
      const ratio = travelDistance / dist;
      entity.transform.x += dx * ratio;
      entity.transform.y += dy * ratio;
      remainingDistance -= travelDistance;

      if (dist - travelDistance <= arrivalRadius) {
        entity.transform.x = waypoint.x;
        entity.transform.y = waypoint.y;
        waypointIdx += 1;
      } else {
        break;
      }
    }

    entity.currentWaypointIndex = waypointIdx;

    if (target && waypointIdx >= pathWaypoints.length && pathWaypoints.length > 0) {
      state.coreHealth -= entity.damage || 5;
      registerTowerDefenseEnemyDefeat(state);
      entities.delete(entity.id);
      if (state.coreHealth < 0) state.coreHealth = 0;
      continue;
    }

    entity.transform.x = Math.max(entity.width / 2, Math.min(canvasWidth - entity.width / 2, entity.transform.x));
    entity.transform.y = Math.max(entity.height / 2, Math.min(canvasHeight - entity.height / 2, entity.transform.y));
  }

  // ── Tower defense projectile movement + impacts ──
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    if (!isTowerDefenseProjectile(projectile)) continue;

    projectile.x += projectile.vx * deltaSeconds;
    projectile.y += projectile.vy * deltaSeconds;

    if (
      projectile.x < -50 ||
      projectile.x > canvasWidth + 50 ||
      projectile.y < -50 ||
      projectile.y > canvasHeight + 50
    ) {
      towerDefenseProjectileEffects.delete(projectile.id);
      projectiles.splice(i, 1);
      continue;
    }

    let hitEnemy: TowerDefenseEntity | null = null;
    for (const entity of entities.values()) {
      if (entity.type !== 'enemy') continue;

      const dx = entity.transform.x - projectile.x;
      const dy = entity.transform.y - projectile.y;
      const hitRadius = Math.max(15, (entity.width || 24) * 0.6);
      if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
        hitEnemy = entity;
        break;
      }
    }

    if (!hitEnemy) continue;

    const effect = towerDefenseProjectileEffects.get(projectile.id);
    const impactX = hitEnemy.transform.x;
    const impactY = hitEnemy.transform.y;
    const impactId = hitEnemy.id;

    applyTowerDefenseProjectileDamage(hitEnemy, projectile.damage, entities, state, onEnemyDefeated);

    if (effect?.towerType === 'cannon' && effect.splashRadius) {
      for (const entity of entities.values()) {
        if (entity.type !== 'enemy' || entity.id === impactId) continue;

        const dx = entity.transform.x - impactX;
        const dy = entity.transform.y - impactY;
        if (Math.sqrt(dx * dx + dy * dy) <= effect.splashRadius) {
          applyTowerDefenseProjectileDamage(entity, projectile.damage * 0.6, entities, state, onEnemyDefeated);
        }
      }
    }

    if (effect?.towerType === 'frost' && effect.slowDuration && entities.has(impactId)) {
      const impactedEnemy = entities.get(impactId);
      if (impactedEnemy) {
        impactedEnemy.slowedUntil = currentTime + effect.slowDuration;
      }
    }

    if (effect?.towerType === 'lightning') {
      const chainHitIds = new Set(effect.hitIds || []);
      chainHitIds.add(impactId);
      spawnLightningChainProjectile(projectiles, entities, impactX, impactY, currentTime, random, {
        ...effect,
        hitIds: chainHitIds,
      });
    }

    towerDefenseProjectileEffects.delete(projectile.id);
    projectiles.splice(i, 1);
  }

  // ── Wave countdown tracking ──
  if (!state.allWavesDone && state.spawnQueue.length === 0 && state.enemiesAlive <= 0 && state.waveIndex < waves.length) {
    const waveDelay = waves[state.waveIndex].delay || 5000;
    if (state.waveTimer < waveDelay) {
      state.waveCountdown = Math.max(0, (waveDelay - state.waveTimer) / 1000);
    } else {
      state.waveCountdown = 0;
    }
  } else {
    state.waveCountdown = -1;
  }

  // ── Wave management ──
  // Wave start is controlled by waitingForPlayer flag (set via startNextWave)
  if (!state.allWavesDone) {
    state.waveTimer += deltaTime;

    // Auto-set waitingForPlayer when wave is ready and no enemies/spawns remain
    if (state.spawnQueue.length === 0 && state.enemiesAlive <= 0 && state.waveIndex < waves.length && !state.waitingForPlayer && state.waveIndex > 0) {
      // A wave just finished — wait for player to start next
      state.waitingForPlayer = true;
      state.gamePhase = 'waiting';
    }

    // Start wave when player clicks (waitingForPlayer = false)
    if (state.waitingForPlayer && state.spawnQueue.length === 0 && state.enemiesAlive <= 0 && state.waveIndex < waves.length) {
      // Wait for player action — no auto-start
      state.waveCountdown = -1;
    } else if (state.spawnQueue.length === 0 && state.enemiesAlive <= 0 && state.waveIndex < waves.length && !state.waitingForPlayer) {
      // First wave or after player triggers start
      const wave = waves[state.waveIndex];
      state.waveMessage = wave.message || `Wave ${state.waveIndex + 1}`;
      state.waveMessageTimer = 3000;
      state.gamePhase = 'active';
      for (const group of wave.enemies) {
        for (let i = 0; i < group.count; i++) state.spawnQueue.push(group);
      }
      state.spawnTimer = 0;
      state.waveIndex++;
      if (state.waveIndex >= waves.length) state.allWavesDone = true;
    }

    // Spawn queued enemies
    if (state.spawnQueue.length > 0) {
      state.spawnTimer += deltaTime;
      if (state.spawnTimer >= 600) {
        state.spawnTimer = 0;
        const group = state.spawnQueue.shift();
        if (group) {
          state.enemyIdCounter++;
          const spawn = pathWaypoints[0] || { x: 60, y: -20 };
          const id = `td-enemy-${state.enemyIdCounter}`;
          const enemyType = group.enemyType || group.type || 'intern';
          entities.set(id, {
            id, type: 'enemy',
            transform: { x: spawn.x, y: spawn.y, scaleX: 1, scaleY: 1, rotation: 0 },
            components: {},
            color: group.color || '#86efac',
            width: group.size || 24, height: group.size || 24,
            health: group.hp || 30, maxHealth: group.hp || 30,
            damage: group.damage || 10,
            tdSpeed: group.speed || 80,
            enemyType,
            hitFlash: 0, facing: 'down',
            scoreValue: group.score || 10,
            currentWaypointIndex: spawnWaypointIndex,
          });
          state.enemiesAlive++;
        }
      }
    }
  }

  if (state.waveMessageTimer > 0) {
    state.waveMessageTimer = Math.max(0, state.waveMessageTimer - deltaTime);
  }

  // ── Tower firing + type effects ──
  const enemyCount = Array.from(entities.values()).filter(e => e.type === 'enemy').length;
  for (const tower of towers) {
    if (currentTime - tower.lastShot < tower.fireRate) continue;

    const targetsInRange: TowerDefenseEntity[] = [];
    for (const entity of entities.values()) {
      if (entity.type !== 'enemy') continue;
      const dx = entity.transform.x - tower.x;
      const dy = entity.transform.y - tower.y;
      if (Math.sqrt(dx * dx + dy * dy) < tower.range) {
        targetsInRange.push(entity);
      }
    }
    if (targetsInRange.length === 0) {
      if (enemyCount > 0) {
        console.warn('[TD] Tower at', tower.x, tower.y, 'has', enemyCount, 'enemies but none in range', tower.range);
      }
      continue;
    }

    targetsInRange.sort((a, b) => {
      const da = Math.hypot(a.transform.x - tower.x, a.transform.y - tower.y);
      const db = Math.hypot(b.transform.x - tower.x, b.transform.y - tower.y);
      return da - db;
    });

    const primary = targetsInRange[0];
    const pdx = primary.transform.x - tower.x;
    const pdy = primary.transform.y - tower.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;

    tower.lastShot = currentTime;

    let projColor = tower.color;
    let projSpeed = 350;
    if (tower.towerType === 'cannon') {
      projColor = '#4b5563';
      projSpeed = 280;
    } else if (tower.towerType === 'frost') {
      projColor = '#93c5fd';
      projSpeed = 400;
    } else if (tower.towerType === 'lightning') {
      projColor = '#fef08a';
      projSpeed = 600;
    }

    console.log('[TD] Tower fires!', tower.towerType, 'at', primary.id, 'dmg:', tower.damage, 'enemies:', enemyCount);
    spawnTowerDefenseProjectile(projectiles, {
      id: `tp-${currentTime}-${random()}`,
      x: tower.x, y: tower.y,
      vx: (pdx / pdist) * projSpeed,
      vy: (pdy / pdist) * projSpeed,
      damage: tower.damage,
      color: projColor,
      createdAt: currentTime,
    }, {
      towerType: tower.towerType,
      splashRadius: tower.splashRadius,
      slowDuration: tower.slowDuration,
      chainCount: tower.chainCount,
      chainRange: tower.chainRange,
      chainDamage: tower.damage * 0.7,
      hitIds: tower.towerType === 'lightning' ? new Set<string>() : undefined,
    });

  }

  // Update game phase
  if (state.coreHealth <= 0) {
    state.gamePhase = 'gameover';
  } else if (state.allWavesDone && state.enemiesAlive <= 0 && state.spawnQueue.length === 0) {
    state.gamePhase = 'victory';
  }

  return {
    gameOver: state.coreHealth <= 0,
    victory: state.allWavesDone && state.enemiesAlive <= 0 && state.spawnQueue.length === 0,
  };
}
