export interface TowerDefenseEnemyGroup {
  type?: string;
  count: number;
  hp?: number;
  speed?: number;
  color?: string;
  size?: number;
  score?: number;
  damage?: number;
}

export interface TowerDefenseWave {
  enemies: TowerDefenseEnemyGroup[];
  delay?: number;
  message?: string;
}

export interface TowerDefenseTower {
  id: string;
  x: number;
  y: number;
  range: number;
  damage: number;
  fireRate: number;
  lastShot: number;
  color: string;
}

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

export interface TowerDefenseEntity {
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

export interface TowerDefenseState {
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
  random?: () => number;
}

export interface TowerDefenseUpdateResult {
  gameOver: boolean;
  victory: boolean;
}

export const DEFAULT_TOWER_DEFENSE_WAVES: TowerDefenseWave[] = [
  { enemies: [{ type: 'intern', count: 5, hp: 25, speed: 80, color: '#86efac', size: 22, score: 10 }], delay: 3000, message: 'Wave 1: Interns smell fresh coffee...' },
  { enemies: [{ type: 'manager', count: 4, hp: 60, speed: 60, color: '#fbbf24', size: 28, score: 25 }], delay: 5000, message: 'Wave 2: Middle management!' },
  { enemies: [{ type: 'intern', count: 8, hp: 30, speed: 100, color: '#86efac', size: 22, score: 10 }, { type: 'manager', count: 3, hp: 70, speed: 55, color: '#fbbf24', size: 28, score: 25 }], delay: 6000, message: 'Wave 3: The interns told their friends...' },
  { enemies: [{ type: 'it-guy', count: 5, hp: 45, speed: 120, color: '#60a5fa', size: 24, score: 30 }], delay: 6000, message: 'Wave 4: IT detected caffeine on the network!' },
  { enemies: [{ type: 'ceo', count: 1, hp: 300, speed: 40, color: '#f43f5e', size: 40, score: 200 }, { type: 'manager', count: 6, hp: 90, speed: 60, color: '#fbbf24', size: 28, score: 25 }], delay: 8000, message: 'Wave 5: THE CEO WANTS A TRIPLE SOY LATTE!' },
];

export function getTowerDefenseWaves(scene: { waves?: TowerDefenseWave[] }): TowerDefenseWave[] {
  return scene.waves || DEFAULT_TOWER_DEFENSE_WAVES;
}

export function createTowerDefenseState(coreHealth = 0): TowerDefenseState {
  return {
    waveIndex: 0,
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    coreHealth,
    maxCoreHealth: coreHealth,
    waveMessage: '',
    waveMessageTimer: 0,
    enemiesAlive: 0,
    allWavesDone: false,
    enemyIdCounter: 0,
  };
}

export function createTowerDefenseTower(player: { transform: { x: number; y: number } }, now = Date.now()): TowerDefenseTower {
  return {
    id: `tower-${now}`,
    x: player.transform.x,
    y: player.transform.y,
    range: 150,
    damage: 15,
    fireRate: 800,
    lastShot: 0,
    color: '#D2691E',
  };
}

export function registerTowerDefenseEnemyDefeat(state: TowerDefenseState): void {
  state.enemiesAlive = Math.max(0, state.enemiesAlive - 1);
}

export function updateTowerDefenseFrame({
  canvasWidth,
  canvasHeight,
  currentTime,
  deltaTime,
  entities,
  towers,
  projectiles,
  state,
  waves,
  random = Math.random,
}: UpdateTowerDefenseFrameOptions): TowerDefenseUpdateResult {
  const target = entities.get('core-bean') || entities.get('magic-bean') || entities.get('player') || entities.get('player-1');

  entities.forEach((entity) => {
    if (entity.type !== 'enemy') return;

    const patrolSpeed = entity.tdSpeed || entity.components?.ai?.speed || 60;
    if (target) {
      const dx = target.transform.x - entity.transform.x;
      const dy = target.transform.y - entity.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        entity.transform.x += (dx / dist) * patrolSpeed * (deltaTime / 1000);
        entity.transform.y += (dy / dist) * patrolSpeed * (deltaTime / 1000);
      }

      if (dist < 30) {
        state.coreHealth -= entity.damage || 5;
        registerTowerDefenseEnemyDefeat(state);
        entities.delete(entity.id);
        if (state.coreHealth < 0) {
          state.coreHealth = 0;
        }
      }
    }

    entity.transform.x = Math.max(entity.width / 2, Math.min(canvasWidth - entity.width / 2, entity.transform.x));
    entity.transform.y = Math.max(entity.height / 2, Math.min(canvasHeight - entity.height / 2, entity.transform.y));
  });

  if (!state.allWavesDone) {
    state.waveTimer += deltaTime;

    if (state.spawnQueue.length === 0 && state.enemiesAlive <= 0 && state.waveIndex < waves.length) {
      if (state.waveTimer >= (waves[state.waveIndex].delay || 5000)) {
        const wave = waves[state.waveIndex];
        state.waveMessage = wave.message || `Wave ${state.waveIndex + 1}`;
        state.waveMessageTimer = 3000;
        for (const group of wave.enemies) {
          for (let i = 0; i < group.count; i++) {
            state.spawnQueue.push(group);
          }
        }
        state.spawnTimer = 0;
        state.waveIndex++;
        if (state.waveIndex >= waves.length) {
          state.allWavesDone = true;
        }
      }
    }

    if (state.spawnQueue.length > 0) {
      state.spawnTimer += deltaTime;
      if (state.spawnTimer >= 600) {
        state.spawnTimer = 0;
        const group = state.spawnQueue.shift();
        if (group) {
          state.enemyIdCounter++;
          const spawnX = 100 + random() * (canvasWidth - 200);
          const id = `td-enemy-${state.enemyIdCounter}`;
          entities.set(id, {
            id,
            type: 'enemy',
            transform: { x: spawnX, y: -20, scaleX: 1, scaleY: 1, rotation: 0 },
            components: {},
            color: group.color || '#86efac',
            width: group.size || 24,
            height: group.size || 24,
            health: group.hp || 30,
            maxHealth: group.hp || 30,
            damage: group.damage || 15,
            tdSpeed: group.speed || 80,
            enemyType: group.type || 'intern',
            patrolOrigin: { x: spawnX, y: -20 },
            patrolOffset: random() * Math.PI * 2,
            hitFlash: 0,
            facing: 'down',
            scoreValue: group.score || 10,
          });
          state.enemiesAlive++;
        }
      }
    }
  }

  if (state.waveMessageTimer > 0) {
    state.waveMessageTimer = Math.max(0, state.waveMessageTimer - deltaTime);
  }

  for (const tower of towers) {
    if (currentTime - tower.lastShot < tower.fireRate) continue;

    let nearest: TowerDefenseEntity | null = null;
    let nearestDistance = Infinity;
    entities.forEach((entity) => {
      if (entity.type !== 'enemy') return;
      const dx = entity.transform.x - tower.x;
      const dy = entity.transform.y - tower.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < tower.range && distance < nearestDistance) {
        nearest = entity;
        nearestDistance = distance;
      }
    });

    if (!nearest) continue;
    const nearestEnemy = nearest as TowerDefenseEntity;

    tower.lastShot = currentTime;
    const dx = nearestEnemy.transform.x - tower.x;
    const dy = nearestEnemy.transform.y - tower.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    projectiles.push({
      id: `tp-${currentTime}-${Math.random()}`,
      x: tower.x,
      y: tower.y,
      vx: (dx / distance) * 350,
      vy: (dy / distance) * 350,
      damage: tower.damage,
      color: '#8B4513',
      createdAt: currentTime,
    });
  }

  return {
    gameOver: state.coreHealth <= 0,
    victory: state.allWavesDone && state.enemiesAlive <= 0 && state.spawnQueue.length === 0,
  };
}
