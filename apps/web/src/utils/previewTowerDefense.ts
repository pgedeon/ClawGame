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
  { enemies: [{ type: 'intern',    count: 5,  hp: 25, speed: 80,  color: '#86efac', size: 22, score: 10 }], delay: 3000, message: 'Wave 1: Interns smell fresh coffee...' },
  { enemies: [{ type: 'manager',   count: 4,  hp: 60, speed: 60,  color: '#fbbf24', size: 28, score: 25 }], delay: 5000, message: 'Wave 2: Middle management!' },
  { enemies: [{ type: 'intern',    count: 8,  hp: 30, speed: 100, color: '#86efac', size: 22, score: 10 }, { type: 'manager', count: 3, hp: 70, speed: 55, color: '#fbbf24', size: 28, score: 25 }], delay: 6000, message: 'Wave 3: The interns told their friends...' },
  { enemies: [{ type: 'it-guy',    count: 5,  hp: 45, speed: 120, color: '#60a5fa', size: 24, score: 30 }], delay: 6000, message: 'Wave 4: IT detected caffeine on the network!' },
  { enemies: [{ type: 'ceo',       count: 1,  hp: 300, speed: 40, color: '#f43f5e', size: 40, score: 200 }, { type: 'manager', count: 6, hp: 90, speed: 60, color: '#fbbf24', size: 28, score: 25 }], delay: 8000, message: 'Wave 5: THE CEO WANTS A TRIPLE SOY LATTE!' },
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
  };
}

export function createTowerDefenseTower(
  player: { transform: { x: number; y: number } },
  type: TowerType = 'basic',
  now = Date.now(),
): TowerDefenseTower {
  const cfg = TOWER_CONFIGS[type];
  return {
    id: `tower-${now}`,
    x: player.transform.x,
    y: player.transform.y,
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

export function updateTowerDefenseFrame({
  canvasWidth, canvasHeight, currentTime, deltaTime,
  entities, towers, projectiles, state, waves, onEnemyDefeated,
  random = Math.random,
}: UpdateTowerDefenseFrameOptions): TowerDefenseUpdateResult {
  const target = entities.get('core-bean') || entities.get('magic-bean') || entities.get('player') || entities.get('player-1');

  // ── Enemy movement via waypoint routing ──
  for (const entity of entities.values()) {
    if (entity.type !== 'enemy') continue;

    const baseSpeed = entity.tdSpeed || entity.components?.ai?.speed || 60;
    const isSlowed = Boolean(entity.slowedUntil && entity.slowedUntil > currentTime);
    const effectiveSpeed = isSlowed ? baseSpeed * 0.5 : baseSpeed;

    const waypointIdx = entity.currentWaypointIndex ?? 1;
    const waypoint = state.waypoints[waypointIdx];

    if (waypoint) {
      const dx = waypoint.x - entity.transform.x;
      const dy = waypoint.y - entity.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        entity.transform.x += (dx / dist) * effectiveSpeed * (deltaTime / 1000);
        entity.transform.y += (dy / dist) * effectiveSpeed * (deltaTime / 1000);
      } else {
        entity.currentWaypointIndex = waypointIdx + 1;
      }
    } else if (target) {
      // No more waypoints — go direct to core
      const dx = target.transform.x - entity.transform.x;
      const dy = target.transform.y - entity.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        entity.transform.x += (dx / dist) * effectiveSpeed * (deltaTime / 1000);
        entity.transform.y += (dy / dist) * effectiveSpeed * (deltaTime / 1000);
      }
      if (dist < 30) {
        state.coreHealth -= entity.damage || 5;
        registerTowerDefenseEnemyDefeat(state);
        entities.delete(entity.id);
        if (state.coreHealth < 0) state.coreHealth = 0;
      }
    }

    entity.transform.x = Math.max(entity.width / 2, Math.min(canvasWidth - entity.width / 2, entity.transform.x));
    entity.transform.y = Math.max(entity.height / 2, Math.min(canvasHeight - entity.height / 2, entity.transform.y));
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
  if (!state.allWavesDone) {
    state.waveTimer += deltaTime;

    if (state.spawnQueue.length === 0 && state.enemiesAlive <= 0 && state.waveIndex < waves.length) {
      if (state.waveTimer >= (waves[state.waveIndex].delay || 5000)) {
        const wave = waves[state.waveIndex];
        state.waveMessage = wave.message || `Wave ${state.waveIndex + 1}`;
        state.waveMessageTimer = 3000;
        for (const group of wave.enemies) {
          for (let i = 0; i < group.count; i++) state.spawnQueue.push(group);
        }
        state.spawnTimer = 0;
        state.waveIndex++;
        if (state.waveIndex >= waves.length) state.allWavesDone = true;
      }
    }

    if (state.spawnQueue.length > 0) {
      state.spawnTimer += deltaTime;
      if (state.spawnTimer >= 600) {
        state.spawnTimer = 0;
        const group = state.spawnQueue.shift();
        if (group) {
          state.enemyIdCounter++;
          const spawn = state.waypoints[0] || { x: 60, y: -20 };
          const id = `td-enemy-${state.enemyIdCounter}`;
          const enemyType = group.enemyType || group.type || 'intern';
          entities.set(id, {
            id, type: 'enemy',
            transform: { x: spawn.x, y: spawn.y, scaleX: 1, scaleY: 1, rotation: 0 },
            components: {},
            color: group.color || '#86efac',
            width: group.size || 24, height: group.size || 24,
            health: group.hp || 30, maxHealth: group.hp || 30,
            damage: group.damage || 15,
            tdSpeed: group.speed || 80,
            enemyType,
            hitFlash: 0, facing: 'down',
            scoreValue: group.score || 10,
            currentWaypointIndex: 1,
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
    if (targetsInRange.length === 0) continue;

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

    projectiles.push({
      id: `tp-${currentTime}-${random()}`,
      x: tower.x, y: tower.y,
      vx: (pdx / pdist) * projSpeed,
      vy: (pdy / pdist) * projSpeed,
      damage: tower.damage,
      color: projColor,
      createdAt: currentTime,
    });

    // Cannon splash
    if (tower.towerType === 'cannon' && tower.splashRadius) {
      for (const entity of entities.values()) {
        if (entity.type !== 'enemy' || entity.id === primary.id) continue;
        const dx = entity.transform.x - primary.transform.x;
        const dy = entity.transform.y - primary.transform.y;
        if (Math.sqrt(dx * dx + dy * dy) < tower.splashRadius!) {
          entity.health = (entity.health || 0) - tower.damage * 0.6;
          entity.hitFlash = 200;
          if (entity.health <= 0) {
            let manaReward = 0;
            registerTowerDefenseEnemyDefeat(state, entity, (bounty) => {
              manaReward = bounty;
            });
            onEnemyDefeated?.(entity, manaReward);
            entities.delete(entity.id);
          }
        }
      }
    }

    // Frost slow
    if (tower.towerType === 'frost' && tower.slowAmount && tower.slowDuration) {
      primary.slowedUntil = currentTime + tower.slowDuration;
    }

    // Lightning chain
    if (tower.towerType === 'lightning' && tower.chainCount && tower.chainRange) {
      let lastTarget: TowerDefenseEntity = primary;
      const hitIds = new Set<string>([primary.id]);

      for (let i = 0; i < tower.chainCount; i++) {
        let nextTarget: TowerDefenseEntity | null = null;
        let minDist = Infinity;

        for (const entity of entities.values()) {
          if (entity.type !== 'enemy' || hitIds.has(entity.id)) continue;
          const dx = entity.transform.x - lastTarget.transform.x;
          const dy = entity.transform.y - lastTarget.transform.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < tower.chainRange! && dist < minDist) {
            nextTarget = entity;
            minDist = dist;
          }
        }

        if (!nextTarget) break;

        const ndx = nextTarget.transform.x - lastTarget.transform.x;
        const ndy = nextTarget.transform.y - lastTarget.transform.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy) || 1;

        projectiles.push({
          id: `tp-${currentTime}-${random()}-chain-${i}`,
          x: lastTarget.transform.x,
          y: lastTarget.transform.y,
          vx: (ndx / ndist) * 600,
          vy: (ndy / ndist) * 600,
          damage: tower.damage * 0.7,
          color: '#fef08a',
          createdAt: currentTime,
        });

        hitIds.add(nextTarget.id);
        lastTarget = nextTarget;
      }
    }
  }

  return {
    gameOver: state.coreHealth <= 0,
    victory: state.allWavesDone && state.enemiesAlive <= 0 && state.spawnQueue.length === 0,
  };
}
