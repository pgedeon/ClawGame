export interface TowerDefenseEnemyGroup {
    type?: string;
    enemyType?: string;
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
export type TowerType = 'basic' | 'cannon' | 'frost' | 'lightning';
export type MapLayout = 'coffee-run' | 'circuit-board';
export interface TowerConfig {
    damage: number;
    range: number;
    fireRate: number;
    cost: number;
    color: string;
    splashRadius?: number;
    slowAmount?: number;
    slowDuration?: number;
    chainCount?: number;
    chainRange?: number;
}
export declare const TOWER_CONFIGS: Record<TowerType, TowerConfig>;
export declare const TOWER_TYPE_ORDER: TowerType[];
export declare const TOWER_DISPLAY: Record<TowerType, {
    icon: string;
    name: string;
}>;
export type TowerDefenseOverlayFeedbackKind = 'error' | 'info' | 'success';
export interface TowerDefenseOverlayState {
    enabled: boolean;
    selectedTowerType: TowerType;
    feedback: {
        message: string;
        kind: TowerDefenseOverlayFeedbackKind;
    } | null;
}
export declare const DEFAULT_TOWER_DEFENSE_OVERLAY_STATE: TowerDefenseOverlayState;
export declare const TOWER_PLACEMENT_RADIUS = 18;
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
export declare const TOWER_BASE_COST = 30;
export declare const MAX_UPGRADE_LEVEL = 3;
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
    hitFlash?: number;
    facing?: string;
    scoreValue?: number;
    slowedUntil?: number;
    currentWaypointIndex?: number;
}
export type TowerDefenseGamePhase = 'idle' | 'waiting' | 'active' | 'gameover' | 'victory';
export interface TowerDefenseState {
    waveCountdown: number;
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
    waveAutoStartTimer: number;
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
export declare const DEFAULT_TOWER_DEFENSE_WAVES: TowerDefenseWave[];
export declare const CIRCUIT_BOARD_WAVES: TowerDefenseWave[];
export declare function getMapWaypoints(layout: MapLayout, w: number, h: number): Waypoint[];
export declare function getTowerDefenseWaves(scene: {
    waves?: TowerDefenseWave[];
}): TowerDefenseWave[];
export declare function getMapLayout(scene: {
    name?: string;
}): MapLayout;
export declare function createTowerDefenseState(coreHealth?: number, mapLayout?: MapLayout, w?: number, h?: number): TowerDefenseState;
export declare function getTowerDefensePathPoints(layout: MapLayout, w: number, h: number, corePosition?: {
    x: number;
    y: number;
} | null): Waypoint[];
export interface TowerPlacementValidationOptions {
    x: number;
    y: number;
    canvasWidth: number;
    canvasHeight: number;
    towers: TowerDefenseTower[];
    mapLayout: MapLayout;
    corePosition?: {
        x: number;
        y: number;
    } | null;
}
export interface TowerPlacementValidationResult {
    valid: boolean;
    reason?: 'bounds' | 'path' | 'overlap' | 'core';
}
export declare function validateTowerPlacement({ x, y, canvasWidth, canvasHeight, towers, mapLayout, corePosition, }: TowerPlacementValidationOptions): TowerPlacementValidationResult;
export declare function createTowerDefenseTowerAt(position: {
    x: number;
    y: number;
}, type?: TowerType, now?: number): TowerDefenseTower;
export declare function createTowerDefenseTower(player: {
    transform: {
        x: number;
        y: number;
    };
}, type?: TowerType, now?: number): TowerDefenseTower;
export declare function getUpgradeCost(tower: TowerDefenseTower): number;
export declare function getSellValue(tower: TowerDefenseTower): number;
export declare function getTowerDefenseEnemyManaBounty(enemy?: Pick<TowerDefenseEntity, 'enemyType' | 'maxHealth' | 'tdSpeed'> | TowerDefenseEnemyGroup | string): number;
export declare function upgradeTower(tower: TowerDefenseTower): boolean;
export declare function registerTowerDefenseEnemyDefeat(state: TowerDefenseState, enemy?: Pick<TowerDefenseEntity, 'enemyType' | 'maxHealth' | 'tdSpeed'> | TowerDefenseEnemyGroup | string, onBounty?: (manaReward: number) => void): void;
export declare function updateTowerDefenseFrame({ canvasWidth, canvasHeight, currentTime, deltaTime, entities, towers, projectiles, state, waves, onEnemyDefeated, random, }: UpdateTowerDefenseFrameOptions): TowerDefenseUpdateResult;
//# sourceMappingURL=previewTowerDefense.d.ts.map