import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from 'react';
import { InventoryManager } from '../rpg/inventory';
import { QuestManager } from '../rpg/quests';
import { DialogueManager } from '../rpg/dialogue';
import { SpellCraftingManager } from '../rpg/spellcrafting';
import type { CombatLogManager } from '../rpg/combatlog';
import {
  ReplayRecorder,
  ReplayPlayer,
  type ReplayData,
  type InputFrame,
} from '../rpg/replay';
import {
  AISystem,
  CollisionSystem,
  EventBus,
  GameLoopCoordinator,
  MovementSystem,
  PhysicsSystem,
  ProjectileSystem,
  PreviewHUD,
  type HUDState,
  type MinimapEntity,
  type HUDTowerDefenseStats,
} from '@clawgame/engine';
import { createPreviewCollisionScene } from '../utils/previewCollisionScene';
import {
  applyPreviewRuntimeScene,
  createPreviewRuntimeScene,
  toEngineInputState,
} from '../utils/previewRuntimeScene';
import {
  applyPreviewProjectileScene,
  createPreviewProjectileScene,
} from '../utils/previewProjectileScene';
import {
  createTowerDefenseState,
  createTowerDefenseTowerAt,
  DEFAULT_TOWER_DEFENSE_OVERLAY_STATE,
  TOWER_CONFIGS,
  TOWER_PLACEMENT_RADIUS,
  getMapLayout,
  getTowerDefensePathPoints,
 getTowerDefenseWaves,
  registerTowerDefenseEnemyDefeat,
  updateTowerDefenseFrame,
  validateTowerPlacement,
  getUpgradeCost, getSellValue, upgradeTower, MAX_UPGRADE_LEVEL,
  type TowerDefenseOverlayFeedbackKind,
  type TowerDefenseOverlayState,
  type TowerType, type TowerDefenseTower,
} from '../utils/previewTowerDefense';
import {
  clonePreviewReplayEntity,
  clonePreviewReplayRuntimeSnapshot,
  restorePreviewReplayState,
} from '../utils/previewReplayState';
import type { PreviewSceneData } from '../utils/previewScene';

interface GameStats {
  fps: number;
  entities: number;
  memory: string;
}

interface FloatingManaText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  amount: number;
}

interface FloatingDamageText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  damage: number;
  color: string;
}

type StateSetter<T> = Dispatch<SetStateAction<T>>;

const TD_STARTING_MANA = 100;
const TD_MAX_MANA = 200;

const TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6',
  enemy: '#ef4444',
  collectible: '#f59e0b',
  obstacle: '#64748b',
  npc: '#22c55e',
  unknown: '#8b5cf6',
};

const TYPE_SIZES: Record<string, [number, number]> = {
  player: [32, 48],
  enemy: [32, 32],
  collectible: [16, 16],
  obstacle: [32, 32],
  npc: [32, 48],
  unknown: [32, 32],
};

const PANEL_KEYS = ['inventory', 'quests', 'spellcraft', 'saveload'];

function normalizeInputKey(key: string): string {
  return key === ' ' ? 'space' : key.toLowerCase();
}

function createKeyState(keys: string[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const key of keys) {
    state[key] = true;
  }
  return state;
}

function isKeyJustPressed(
  currentKeys: Record<string, boolean>,
  previousKeys: Record<string, boolean>,
  key: string,
): boolean {
  return Boolean(currentKeys[key]) && !Boolean(previousKeys[key]);
}

function getMovementDirection(keys: Record<string, boolean>): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (keys.arrowleft || keys.a) dx = -1;
  else if (keys.arrowright || keys.d) dx = 1;

  if (keys.arrowup || keys.w) dy = -1;
  else if (keys.arrowdown || keys.s) dy = 1;

  if (dx !== 0 && dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;
  }

  return { dx, dy };
}

export interface LegacyCanvasPreviewSessionOptions {
  runtimeHostRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  animationRef: MutableRefObject<number | null>;
  gameStatsRef: MutableRefObject<GameStats>;
  highScoreRef?: MutableRefObject<number>;
  gameLoopState: MutableRefObject<any>;
  activeScene: PreviewSceneData;
  projectGenre: string;
  gameStarted: boolean;
  gamePaused: boolean;
  gameOver: boolean;
  victory: boolean;
  isRecording: boolean;
  replaySessionKey: number;
  replayAutoplay: boolean;
  replayStartProgress: number;
  questHUDText: string;
  inventoryRef: MutableRefObject<InventoryManager>;
  questMgrRef: MutableRefObject<QuestManager>;
  dialogueMgrRef: MutableRefObject<DialogueManager>;
  spellMgrRef: MutableRefObject<SpellCraftingManager>;
  combatLogRef?: MutableRefObject<CombatLogManager>;
  replayRecorderRef: MutableRefObject<ReplayRecorder | null>;
  replayPlayerRef: MutableRefObject<ReplayPlayer | null>;
  replayDataRef: MutableRefObject<ReplayData | null>;
  pendingReplayStepMsRef: MutableRefObject<number>;
  syncRPGState: () => void;
  handleSave: (slotId: number) => void;
  setCollectedRunes: StateSetter<string[]>;
  setGameOver: StateSetter<boolean>;
  setVictory: StateSetter<boolean>;
  setPlaybackTime: StateSetter<number>;
  setPlaybackProgress: StateSetter<number>;
  setIsPlayingBack: StateSetter<boolean>;
  setPlayerScore: StateSetter<number>;
  setPlayerHealth: StateSetter<number>;
  setPlayerMana: StateSetter<number>;
  setTimeElapsed: StateSetter<number>;
  setGamePaused: StateSetter<boolean>;
  setActivePanel: StateSetter<any>;
  setDialogueSpeaker: StateSetter<string>;
  setDialoguePortrait: StateSetter<string>;
  setDialogueText: StateSetter<string>;
  setDialogueChoices: StateSetter<Array<{ text: string; index: number }>>;
  setGameStats: StateSetter<GameStats>;
  setTowerDefenseOverlayState?: StateSetter<TowerDefenseOverlayState>;
}

export function runLegacyCanvasPreviewSession(
  options: LegacyCanvasPreviewSessionOptions,
): (() => void) | void {
  const {
    runtimeHostRef,
    canvasRef,
    animationRef,
    gameStatsRef,
    highScoreRef,
    gameLoopState,
    activeScene,
    projectGenre,
    gameStarted,
    gamePaused,
    gameOver,
    victory,
    isRecording,
    replaySessionKey,
    replayAutoplay,
    replayStartProgress,
    questHUDText,
    inventoryRef,
    questMgrRef,
    dialogueMgrRef,
    spellMgrRef,
    replayRecorderRef,
    replayPlayerRef,
    replayDataRef,
    pendingReplayStepMsRef,
    syncRPGState,
    handleSave,
    setCollectedRunes,
    setGameOver,
    setVictory,
    setPlaybackTime,
    setPlaybackProgress,
    setIsPlayingBack,
    setPlayerScore,
    setPlayerHealth,
    setPlayerMana,
    setTimeElapsed,
    setGamePaused,
    setActivePanel,
    setDialogueSpeaker,
    setDialoguePortrait,
    setDialogueText,
    setDialogueChoices,
    setGameStats,
    setTowerDefenseOverlayState,
  } = options;

  if (!canvasRef.current) return;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const runtimeHost = runtimeHostRef.current;

  if (runtimeHost) {
    runtimeHost.dataset.previewRuntimeActive = 'legacy-canvas';
    runtimeHost.dataset.previewRuntimeMounted = 'true';
  }

  const resizeCanvas = () => {
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  if (canvas.parentElement) {
    resizeObserver.observe(canvas.parentElement);
  }

  const replayPlayer = replaySessionKey > 0 && replayDataRef.current
    ? new ReplayPlayer(replayDataRef.current)
    : null;
  replayPlayerRef.current = replayPlayer;
  if (replayPlayer && replayStartProgress > 0) {
    replayPlayer.seekTo(replayStartProgress);
  }

  // ─── Engine systems ───

  const collisionBus = new EventBus();
  const collisionSystem = new CollisionSystem();
  collisionSystem.attach(collisionBus);
  const aiSystem = new AISystem();
  const movementSystem = new MovementSystem({ width: canvas.width, height: canvas.height });
  const physicsSystem = new PhysicsSystem({ width: canvas.width, height: canvas.height });
  const projectileSystem = new ProjectileSystem({ width: canvas.width, height: canvas.height });
  projectileSystem.attach(collisionBus);

  // ─── Preview HUD Renderer (M14) ───
  const previewHUD = new PreviewHUD(ctx, { width: canvas.width, height: canvas.height });

  // ─── GameLoopCoordinator (M14) ───
  // Owns score, health, mana, collected items, time, victory/defeat state.
  // Auto-listens to collision:pickup and collision:damage on the bus.

  const isTDMode = projectGenre === 'strategy' || projectGenre === 'tower-defense';

  const allRunesInScene = activeScene.entities.filter(
    (entity) => entity.type === 'collectible' && entity.components?.collectible?.type === 'rune',
  );

  const coordinator = new GameLoopCoordinator({
    initialState: isTDMode ? { mana: TD_STARTING_MANA, maxMana: TD_MAX_MANA } : undefined,
    victoryConditions: allRunesInScene.length > 0
      ? [{ type: 'collect-all', tag: 'rune' }]
      : [],
  });
  coordinator.attach(collisionBus);

  // Subscribe coordinator state changes to React setters
  const coordinatorSubscriptions = [
    collisionBus.on('game:score-changed', ({ newScore }) => {
      setPlayerScore(newScore);
    }),
    collisionBus.on('game:health-changed', ({ newHealth }) => {
      setPlayerHealth(newHealth);
    }),
    collisionBus.on('game:mana-changed', ({ newMana }) => {
      setPlayerMana(newMana);
    }),
    collisionBus.on('game:collectible-pickup', ({ itemId }) => {
      const state = coordinator.getState();
      setCollectedRunes([...state.collectedItems]);
    }),
    collisionBus.on('game:over', () => {
      setGameOver(true);
    }),
    collisionBus.on('game:victory', () => {
      setVictory(true);
    }),
  ];

  // ─── Entities ───

  const entities = new Map<string, any>();
  for (const entity of activeScene.entities) {
    const t = entity.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 };
    const eType = entity.type || 'unknown';
    const defaultSize = TYPE_SIZES[eType] || [32, 32];
    const comps = entity.components || {};
    entities.set(entity.id, {
      id: entity.id,
      type: eType,
      transform: { ...t },
      components: comps,
      vx: 0,
      vy: 0,
      color: comps.sprite?.color || TYPE_COLORS[eType] || '#8b5cf6',
      width: comps.sprite?.width || defaultSize[0],
      height: comps.sprite?.height || defaultSize[1],
      health: comps.stats?.hp || 30,
      maxHealth: comps.stats?.maxHp || 30,
      damage: comps.stats?.damage || 10,
      enemyType: comps?.enemyType || comps?.ai?.type || 'slime',
      patrolOrigin: { x: t.x, y: t.y },
      patrolOffset: Math.random() * Math.PI * 2,
      hitFlash: 0,
      facing: 'right',
    });
  }

  const liveKeys: Record<string, boolean> = {};
  let previousKeys: Record<string, boolean> = {};
  const projectiles: any[] = [];
  const deathParticles: any[] = [];
  const manaTexts: FloatingManaText[] = [];
  const damageTexts: FloatingDamageText[] = [];
  let frameCount = 0;
  let lastTime = performance.now();
  let lastShotTime = 0;
  let healPulse: { x: number; y: number; startTime: number; duration: number } | null = null;
  const defeatedEnemies: string[] = [];

  // Delegate invincibility to coordinator; track locally only for replay restore
  let localInvincibleTimer = 0;

  const towers: TowerDefenseTower[] = [];
  let selectedTowerId: string | null = null;
  let hoveredTowerId: string | null = null;
  const selectedTowerType: { current: TowerType } = { current: 'basic' };
  const tdWaves = getTowerDefenseWaves(activeScene as any);
  const tdMapLayout = getMapLayout(activeScene as any);
  const coreEntity = isTDMode ? Array.from(entities.values()).find((e: any) => e.id === 'core-bean' || e.id === 'magic-bean') : null;
  const tdState = createTowerDefenseState(coreEntity?.health || coreEntity?.maxHealth || 0, tdMapLayout, canvas.width, canvas.height);
  // Mutable ref so click handlers can read/modify TD state
  const tdStateRef = { current: tdState };
  const placementPointer = {
    x: coreEntity?.transform?.x || canvas.width * 0.5,
    y: coreEntity?.transform?.y || canvas.height * 0.6,
    active: isTDMode,
    source: 'keyboard' as 'mouse' | 'keyboard',
  };
  let pendingCanvasClick: { x: number; y: number } | null = null;
  let placementFeedback: { message: string; kind: TowerDefenseOverlayFeedbackKind; expiresAt: number } | null = null;
  let lastOverlaySignature = '';

  inventoryRef.current = new InventoryManager() as any;
  questMgrRef.current = new QuestManager() as any;
  dialogueMgrRef.current = new DialogueManager() as any;
  spellMgrRef.current = new SpellCraftingManager() as any;

  const inventory = inventoryRef.current as any;
  const questMgr = questMgrRef.current as any;
  const dialogueMgr = dialogueMgrRef.current as any;
  const spellMgr = spellMgrRef.current as any;

  if (activeScene.dialogueTrees) {
    activeScene.dialogueTrees.forEach((dt: any) => dialogueMgr.registerTree(dt));
  }

  const spawnEnemyDeathParticles = (enemy: any) => {
    const color = enemy.color || '#ef4444';
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      deathParticles.push({
        x: enemy.transform.x,
        y: enemy.transform.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600,
        maxLife: 600,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  };

  const spawnManaText = (enemy: any, amount: number) => {
    if (amount <= 0) return;
    manaTexts.push({
      x: enemy.transform.x,
      y: enemy.transform.y - Math.max(18, (enemy.height || 24) * 0.6),
      vx: (Math.random() - 0.5) * 18,
      vy: -44,
      life: 900,
      maxLife: 900,
      amount,
    });
  };

  const spawnDamageText = (x: number, y: number, damage: number, color: string = '#fff') => {
    damageTexts.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - 10,
      vx: (Math.random() - 0.5) * 30,
      vy: -55,
      life: 600,
      maxLife: 600,
      damage,
      color,
    });
  };

  const awardTowerDefenseBounty = (enemy: any, manaReward?: number) => {
    if (!isTDMode) return;

    let bounty = manaReward ?? 0;
    if (manaReward === undefined) {
      registerTowerDefenseEnemyDefeat(tdState, enemy, (reward) => {
        bounty = reward;
      });
    }

    if (bounty <= 0) return;
    coordinator.setMana(coordinator.getState().mana + bounty);
    spawnManaText(enemy, bounty);
  };

  const handleEnemyDefeat = (
    enemy: any,
    options: { manaReward?: number; deleteEntity?: boolean } = {},
  ) => {
    coordinator.addScore(enemy.scoreValue || 50);
    defeatedEnemies.push(enemy.id);
    questMgr.onKill(enemy.enemyType || 'slime');
    awardTowerDefenseBounty(enemy, options.manaReward);
    spawnEnemyDeathParticles(enemy);
    if (options.deleteEntity !== false) {
      entities.delete(enemy.id);
    }
    syncRPGState();
  };

  // ─── Collision subscriptions ───
  // Note: collision:pickup and collision:damage are now auto-handled by the
  // GameLoopCoordinator. We still subscribe for side-effects (entity removal,
  // RPG system sync, tower defense, etc.) that are beyond the coordinator's scope.

  const collisionSubscriptions = [
    collisionBus.on('collision:pickup', ({ collectibleId, type, value }) => {
      const collectible = entities.get(collectibleId);
      if (!collectible) return;

      if (type === 'item' || collectible.type === 'item' || collectible.components?.itemDrop) {
        const drop = collectible.components?.itemDrop;
        if (drop) {
          inventory.addItem({ ...drop });
          syncRPGState();
        }
        // Score is now handled by coordinator
      } else if (type === 'health') {
        coordinator.heal(collectible.components?.collectible?.healAmount || 30);
        // Score handled by coordinator
      }
      // rune pickup: coordinator.collectItem is auto-called via bus

      entities.delete(collectibleId);
    }),
    collisionBus.on('collision:damage', ({ damage }) => {
      // Health tracking is now handled by coordinator via bus
      // We only track invincibility flash timer for the renderer
      localInvincibleTimer = 1000;
    }),
    collisionBus.on('projectile:hit', ({ targetId, targetType, damage }) => {
      if (targetType !== 'enemy') return;

      const enemy = entities.get(targetId);
      if (!enemy) return;

      enemy.health -= damage;
      enemy.hitFlash = 200;
      if (enemy.health <= 0) {
        handleEnemyDefeat(enemy);
      }
    }),
    collisionBus.on('collision:trigger', ({ event }) => {
      if (event === 'level_complete' || event === 'victory') {
        setVictory(true);
      }
    }),
  ];

  inventory.addItem({
    id: 'health-potion',
    name: 'Health Potion',
    description: 'Restores 25 HP.',
    type: 'potion',
    rarity: 'common',
    icon: '🧪',
    stackable: true,
    quantity: 2,
    maxStack: 10,
    stats: { heal: 25 },
    usable: true,
    equippable: false,
    sellValue: 3,
  });

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const setPlacementPointer = (
    x: number,
    y: number,
    source: 'mouse' | 'keyboard',
  ) => {
    placementPointer.x = Math.max(0, Math.min(canvas.width, x));
    placementPointer.y = Math.max(0, Math.min(canvas.height, y));
    placementPointer.active = true;
    placementPointer.source = source;

    hoveredTowerId = null;
    for (const tower of towers) {
      if (Math.hypot(tower.x - placementPointer.x, tower.y - placementPointer.y) <= TOWER_PLACEMENT_RADIUS + 4) {
        hoveredTowerId = tower.id;
        break;
      }
    }
  };

  const setPlacementFeedback = (
    message: string,
    kind: TowerDefenseOverlayFeedbackKind = 'info',
    durationMs = 1400,
  ) => {
    placementFeedback = {
      message,
      kind,
      expiresAt: performance.now() + durationMs,
    };
  };

  const publishTowerDefenseOverlayState = (force = false) => {
    if (!setTowerDefenseOverlayState) return;

    if (placementFeedback && placementFeedback.expiresAt <= performance.now()) {
      placementFeedback = null;
    }

    const nextState: TowerDefenseOverlayState = {
      enabled: isTDMode,
      selectedTowerType: selectedTowerType.current,
      feedback: placementFeedback
        ? {
            message: placementFeedback.message,
            kind: placementFeedback.kind,
          }
        : null,
    };
    const signature = JSON.stringify(nextState);
    if (!force && signature === lastOverlaySignature) return;

    lastOverlaySignature = signature;
    setTowerDefenseOverlayState(nextState);
  };

  const findTowerAtPoint = (x: number, y: number): TowerDefenseTower | null => {
    for (const tower of towers) {
      if (Math.hypot(tower.x - x, tower.y - y) <= TOWER_PLACEMENT_RADIUS + 4) {
        return tower;
      }
    }
    return null;
  };

  const tryPlaceTowerAtPoint = (x: number, y: number) => {
    const existingTower = findTowerAtPoint(x, y);
    if (existingTower) {
      selectedTowerId = existingTower.id;
      publishTowerDefenseOverlayState();
      return true;
    }

    const cfg = TOWER_CONFIGS[selectedTowerType.current];
    if (coordinator.getState().mana < cfg.cost) {
      setPlacementFeedback('Not enough mana', 'error');
      publishTowerDefenseOverlayState();
      return false;
    }

    const validation = validateTowerPlacement({
      x,
      y,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      towers,
      mapLayout: tdState.mapLayout,
      corePosition: coreEntity?.transform || null,
    });
    if (!validation.valid) {
      const message = validation.reason === 'path'
        ? 'Cannot place on the path'
        : validation.reason === 'overlap'
          ? 'Too close to another tower'
          : validation.reason === 'core'
            ? 'Too close to the core'
            : 'Cannot place there';
      setPlacementFeedback(message, 'error');
      publishTowerDefenseOverlayState();
      return false;
    }

    if (!coordinator.useMana(cfg.cost)) {
      setPlacementFeedback('Not enough mana', 'error');
      publishTowerDefenseOverlayState();
      return false;
    }

    const newTower = createTowerDefenseTowerAt({ x, y }, selectedTowerType.current);
    towers.push(newTower);
    selectedTowerId = newTower.id;
    publishTowerDefenseOverlayState();
    return true;
  };

  publishTowerDefenseOverlayState(true);

  gameLoopState.current = {
    entities,
    getHealth: () => coordinator.getState().health,
    setHealth: (nextHealth: number) => coordinator.setHealth(nextHealth),
    getMana: () => coordinator.getState().mana,
    setMana: (nextMana: number) => coordinator.setMana(nextMana),
    getScore: () => coordinator.getState().score,
    setScore: (nextScore: number) => coordinator.setScore(nextScore),
    getGameTime: () => coordinator.getState().timeElapsed * 1000,
    getCollectedRunes: () => coordinator.getState().collectedItems,
    getDefeatedEnemies: () => defeatedEnemies,
    getPlayer: () => entities.get('player') || entities.get('player-1'),
    inventory,
    questMgr,
    dialogueMgr,
    spellMgr,
    canvas,
    getSelectedTowerType: () => selectedTowerType.current,
    setSelectedTowerType: (nextType: TowerType) => {
      selectedTowerType.current = nextType;
      publishTowerDefenseOverlayState();
    },
    placeSelectedTowerAtPointer: () => {
      if (!isTDMode || !placementPointer.active) return false;
      return tryPlaceTowerAtPoint(placementPointer.x, placementPointer.y);
    },
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const normalizedKey = normalizeInputKey(event.key);
    liveKeys[normalizedKey] = true;
    if (
      normalizedKey === 'space'
      || normalizedKey === 'tab'
      || normalizedKey === 'escape'
      || normalizedKey === 'f5'
      || normalizedKey.startsWith('arrow')
    ) {
      event.preventDefault();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    liveKeys[normalizeInputKey(event.key)] = false;
  };

  window.addEventListener('keydown', handleKeyDown);
  const queueCanvasInteraction = (x: number, y: number, source: 'mouse' | 'keyboard' = 'mouse') => {
    if (!isTDMode) return;
    setPlacementPointer(x, y, source);
    pendingCanvasClick = { x, y };
  };
  const handleCanvasMouseMove = (event: MouseEvent) => {
    if (!isTDMode) return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    setPlacementPointer(point.x, point.y, 'mouse');
  };
  const handleCanvasClick = (event: MouseEvent) => {
    if (!isTDMode) return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    queueCanvasInteraction(point.x, point.y, 'mouse');
  };
  const handleCanvasTouch = (event: TouchEvent) => {
    if (!isTDMode || event.touches.length === 0) return;
    event.preventDefault();
    const touch = event.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY);
    setPlacementPointer(point.x, point.y, 'mouse');
  };
  const handleCanvasTouchStart = (event: TouchEvent) => {
    if (!isTDMode || event.touches.length === 0) return;
    event.preventDefault();
    const touch = event.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY);
    queueCanvasInteraction(point.x, point.y, 'mouse');
  };
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('touchmove', handleCanvasTouch, { passive: false });
  canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
  window.addEventListener('keyup', handleKeyUp);

  const syncReplayPlaybackState = (activeReplayPlayer: ReplayPlayer | null) => {
    if (!activeReplayPlayer) return;
    setPlaybackTime(Math.round(activeReplayPlayer.currentTimeMs / 1000));
    setPlaybackProgress(activeReplayPlayer.progress);
    setIsPlayingBack(activeReplayPlayer.isPlaying);
  };

  const syncSimulationState = () => {
    const state = coordinator.getState();
    setPlayerScore(state.score);
    setPlayerHealth(state.health);
    setPlayerMana(state.mana);
    setCollectedRunes([...state.collectedItems]);
    setTimeElapsed(Math.floor(state.timeElapsed));
    syncRPGState();
  };

  const restoreReplaySnapshot = (snapshot: ReturnType<ReplayPlayer['getSnapshotBeforeOrAt']>) => {
    if (!snapshot) return;

    const restored = restorePreviewReplayState(snapshot, {
      entities,
      projectiles,
      towers,
      tdState,
      collectedRuneIds: [...coordinator.getState().collectedItems],
      defeatedEnemies,
    });

    coordinator.setScore(restored.score);
    coordinator.setHealth(restored.health);
    coordinator.setMana(restored.mana);
    localInvincibleTimer = restored.invincibleTimer;
    lastShotTime = restored.lastShotTime;

    if (restored.inventory) {
      inventory.load(restored.inventory);
    }
    if (restored.quests) {
      questMgr.load(restored.quests);
    }
    if (restored.learnedSpells) {
      spellMgr.load(restored.learnedSpells);
    }
    if (restored.dialogueFlags) {
      dialogueMgr.load(restored.dialogueFlags);
    }

    syncSimulationState();
  };

  const runSimulationFrame = ({
    frameDeltaTime,
    activeKeys,
    activeReplayPlayer = null,
    allowPanelShortcuts = true,
    clickPosition = null,
    recordReplayFrame = false,
    syncUi = true,
  }: {
    frameDeltaTime: number;
    activeKeys: Record<string, boolean>;
    activeReplayPlayer?: ReplayPlayer | null;
    allowPanelShortcuts?: boolean;
    clickPosition?: { x: number; y: number } | null;
    recordReplayFrame?: boolean;
    syncUi?: boolean;
  }) => {
    const panelOpen = allowPanelShortcuts
      && PANEL_KEYS.includes(document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none');
    const wasJustPressed = (key: string) => isKeyJustPressed(activeKeys, previousKeys, key);

    // Advance coordinator time (converts ms → seconds for engine)
    coordinator.update(frameDeltaTime / 1000);
    const simulationTime = coordinator.getState().timeElapsed * 1000;
    if (syncUi) {
      setTimeElapsed(Math.floor(simulationTime / 1000));
    }

    if (localInvincibleTimer > 0) localInvincibleTimer -= frameDeltaTime;

    // Mana regen (engine coordinator tracks mana, but regen rate is game-specific)
    coordinator.regenerateMana(frameDeltaTime * 0.01);
    spellMgr.tickCooldowns(frameDeltaTime);

    if (allowPanelShortcuts && wasJustPressed('escape')) {
      setActivePanel((prev: any) => {
        if (prev !== 'none' && prev !== 'dialogue') return 'none';
        if (prev === 'none' && gameStarted && !gameOver && !victory) {
          setGamePaused(true);
          return 'saveload';
        }
        return prev;
      });
      previousKeys = { ...activeKeys };
      return;
    }

    if (wasJustPressed('space') && !panelOpen) {
      if (simulationTime - lastShotTime > 300) {
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const { dx, dy } = getMovementDirection(activeKeys);
          projectiles.push({
            id: `proj-${Date.now()}-${Math.random()}`,
            x: player.transform.x,
            y: player.transform.y,
            vx: (dx || 1) * 500,
            vy: dy * 500,
            damage: inventory.getWeaponDamage(),
            color: '#fbbf24',
            createdAt: simulationTime,
          });
          lastShotTime = simulationTime;
        }
      }
    }

    // ── Tower Defense: wave start / restart click handling ──
    if (isTDMode && clickPosition) {
      if (tdStateRef.current) {
        const td = tdStateRef.current;
        if (td.gamePhase === 'waiting') {
          // Start next wave
          td.waitingForPlayer = false;
          publishTowerDefenseOverlayState(true);
        } else if (td.gamePhase === 'gameover' || td.gamePhase === 'victory') {
          // Restart the game
          const freshState = createTowerDefenseState(canvas.width);
          freshState.waitingForPlayer = false;
          Object.assign(tdStateRef.current, freshState);
          tdStateRef.current.waitingForPlayer = false;
          tdStateRef.current.gamePhase = 'active';
          coordinator.setMana(TD_STARTING_MANA);
          coordinator.setScore(0);
          towers.length = 0;
          projectiles.length = 0;
          deathParticles.length = 0;
          manaTexts.length = 0;
          // Remove all enemies
          for (const [eid, e] of entities) {
            if (e.type === 'enemy') entities.delete(eid);
          }
          defeatedEnemies.length = 0;
          publishTowerDefenseOverlayState(true);
          return; // skip tower placement this frame
        }
      }
      tryPlaceTowerAtPoint(clickPosition.x, clickPosition.y);
    }

    if ((wasJustPressed('t') || wasJustPressed('enter')) && isTDMode) {
      if (placementPointer.active) {
        tryPlaceTowerAtPoint(placementPointer.x, placementPointer.y);
      }
    }
    if (wasJustPressed('1') && isTDMode) selectedTowerType.current = 'basic';
    if (wasJustPressed('2') && isTDMode) selectedTowerType.current = 'cannon';
    if (wasJustPressed('3') && isTDMode) selectedTowerType.current = 'frost';
    if (wasJustPressed('4') && isTDMode) selectedTowerType.current = 'lightning';
    if (wasJustPressed("u") && isTDMode && selectedTowerId) {
      const tower = towers.find((t) => t.id === selectedTowerId);
      if (tower && tower.upgradeLevel < MAX_UPGRADE_LEVEL) {
        const cost = getUpgradeCost(tower);
        if (coordinator.useMana(cost)) {
          upgradeTower(tower);
        } else {
          setPlacementFeedback('Not enough mana', 'error');
        }
        publishTowerDefenseOverlayState();
      }
    }
    if (wasJustPressed("s") && isTDMode && selectedTowerId) {
      const idx = towers.findIndex((t) => t.id === selectedTowerId);
      if (idx >= 0) {
        const tower = towers[idx];
        const sellValue = getSellValue(tower);
        coordinator.setMana(coordinator.getState().mana + sellValue);
        towers.splice(idx, 1);
        selectedTowerId = null;
        publishTowerDefenseOverlayState();
      }
    }

    if (allowPanelShortcuts && wasJustPressed('i')) {
      setActivePanel((panel: any) => panel === 'inventory' ? 'none' : 'inventory');
      syncRPGState();
      previousKeys = { ...activeKeys };
      return;
    }
    if (allowPanelShortcuts && wasJustPressed('j')) {
      setActivePanel((panel: any) => panel === 'quests' ? 'none' : 'quests');
      syncRPGState();
      previousKeys = { ...activeKeys };
      return;
    }
    if (allowPanelShortcuts && wasJustPressed('c')) {
      setActivePanel((panel: any) => panel === 'spellcraft' ? 'none' : 'spellcraft');
      syncRPGState();
      previousKeys = { ...activeKeys };
      return;
    }
    if (allowPanelShortcuts && wasJustPressed('f5')) {
      handleSave(0);
      previousKeys = { ...activeKeys };
      return;
    }
    if (allowPanelShortcuts && wasJustPressed('tab')) {
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        const npcs = Array.from(entities.values()).filter((entity: any) => entity.type === 'npc');
        for (const npc of npcs) {
          const dx = player.transform.x - npc.transform.x;
          const dy = player.transform.y - npc.transform.y;
          if (Math.sqrt(dx * dx + dy * dy) < 80) {
            const treeId = npc.components?.npc?.dialogueTreeId;
            if (treeId && dialogueMgr.startDialogue(treeId)) {
              setActivePanel('dialogue');
              const line = dialogueMgr.getCurrentLine();
              if (line) {
                setDialogueSpeaker(line.speaker);
                setDialoguePortrait(line.portrait || '💬');
                setDialogueText(line.text);
                const choices = dialogueMgr.getChoices();
                setDialogueChoices(
                  choices.map((choice: any, index: number) => ({ text: choice.text, index })),
                );
              }
              previousKeys = { ...activeKeys };
              return;
            }
          }
        }
      }
    }

    const justPressedHotkey = ['1', '2', '3', '4', '5', '6', '7', '8'].find((key) => wasJustPressed(key));
    if (justPressedHotkey && !panelOpen) {
      const hotkey = parseInt(justPressedHotkey, 10);
      const spell = spellMgr.castSpell(hotkey);
      if (spell) {
        options.combatLogRef?.current?.spell(`${spell.icon} ${spell.name} cast! (DMG: ${spell.damage}, MP: ${spell.manaCost})`);
        coordinator.useMana(spell.manaCost);
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const { dx, dy } = getMovementDirection(activeKeys);
          if (spell.effectType === 'heal') {
            // Trigger heal pulse effect
            healPulse = { x: player.transform.x, y: player.transform.y, startTime: simulationTime, duration: 0.5 };
            coordinator.heal(spell.damage);
          } else if (spell.effectType === 'projectile') {
            projectiles.push({
              id: `spell-${Date.now()}-${Math.random()}`,
              x: player.transform.x,
              y: player.transform.y,
              vx: (dx || 1) * spell.projectileSpeed,
              vy: dy * spell.projectileSpeed,
              damage: spell.damage,
              color: spell.projectileColor,
              createdAt: simulationTime,
              isSpell: true,
              trail: [],
            });
          }
        }
        syncRPGState();
      }
    }

    projectileSystem.setWorldBounds({ width: canvas.width, height: canvas.height });
    const projectileScene = createPreviewProjectileScene(projectiles, entities.values());
    projectileSystem.update(projectileScene, frameDeltaTime / 1000);
    applyPreviewProjectileScene(projectileScene, projectiles);
    for (let i = deathParticles.length - 1; i >= 0; i--) {
      const p = deathParticles[i];
      p.x += p.vx * (frameDeltaTime / 1000);
      p.y += p.vy * (frameDeltaTime / 1000);
      p.vy += 120 * (frameDeltaTime / 1000);
      p.life -= frameDeltaTime;
      if (p.life <= 0) deathParticles.splice(i, 1);
    }
    for (let i = manaTexts.length - 1; i >= 0; i--) {
      const manaText = manaTexts[i];
      manaText.x += manaText.vx * (frameDeltaTime / 1000);
      manaText.y += manaText.vy * (frameDeltaTime / 1000);
      manaText.life -= frameDeltaTime;
      if (manaText.life <= 0) manaTexts.splice(i, 1);
    }
    for (let i = damageTexts.length - 1; i >= 0; i--) {
      const dt = damageTexts[i];
      dt.x += dt.vx * (frameDeltaTime / 1000);
      dt.y += dt.vy * (frameDeltaTime / 1000);
      dt.life -= frameDeltaTime;
      if (dt.life <= 0) damageTexts.splice(i, 1);
    }


    movementSystem.setWorldBounds({ width: canvas.width, height: canvas.height });
    physicsSystem.setWorldBounds({ width: canvas.width, height: canvas.height });
    const runtimeScene = createPreviewRuntimeScene(entities.values(), { isTowerDefense: isTDMode });
    // AI movement is handled by tower-defense wave system in TD mode
    if (!isTDMode) {
      aiSystem.update(runtimeScene, frameDeltaTime / 1000);
    }
    movementSystem.update(runtimeScene, toEngineInputState(activeKeys), frameDeltaTime / 1000);
    physicsSystem.update(runtimeScene, frameDeltaTime / 1000);
    applyPreviewRuntimeScene(runtimeScene, entities);

    if (isTDMode) {
      const keyboardMovement = activeKeys.arrowleft
        || activeKeys.arrowright
        || activeKeys.arrowup
        || activeKeys.arrowdown
        || activeKeys.a
        || activeKeys.d
        || activeKeys.w
        || activeKeys.s;
      if (keyboardMovement) {
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          setPlacementPointer(player.transform.x, player.transform.y, 'keyboard');
        }
      }
    }

    entities.forEach((entity: any) => {
      if (entity.type === 'enemy' && entity.hitFlash > 0) {
        entity.hitFlash -= frameDeltaTime;
      }

      if (entity.type === 'collectible' || entity.type === 'item') {
        entity.transform.rotation = (entity.transform.rotation || 0) + frameDeltaTime * 0.003;
      }
    });

    collisionSystem.update(createPreviewCollisionScene(entities.values(), inventory.getArmorDefense()));

    // Victory: check if all runes collected (coordinator handles this via victory conditions)
    const coordState = coordinator.getState();
    if (coordState.isVictory) {
      setVictory(true);
    }

    if (isTDMode) {
      // Track wave completion for bonus mana
      const prevWaveIndex = tdState.waveIndex;
      const prevEnemiesAlive = tdState.enemiesAlive;
      const prevPhase = tdState.gamePhase;

      const tdResult = updateTowerDefenseFrame({
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        currentTime: simulationTime,
        deltaTime: frameDeltaTime,
        entities,
        towers,
        projectiles,
        state: tdState,
        waves: tdWaves,
        onEnemyDefeated: (enemy, manaReward) => {
          const lastX = enemy.transform.x;
          const lastY = enemy.transform.y;
          const dmg = enemy.maxHealth || 0;
          handleEnemyDefeat(enemy, { manaReward, deleteEntity: false });
          // Show total damage dealt as a big number
          spawnDamageText(lastX, lastY, dmg, '#fbbf24');
        },
      });

      // Give wave completion bonus when a wave clears (enemies reach 0 while wave was active)
      if (prevPhase === 'active' && tdState.gamePhase === 'waiting' && prevEnemiesAlive > 0 && tdState.enemiesAlive === 0) {
        const completedWave = prevWaveIndex; // waveIndex is already incremented
        const bonus = 30 + completedWave * 10;
        coordinator.setMana(coordinator.getState().mana + bonus);
        spawnManaText({ transform: { x: canvas.width / 2, y: canvas.height / 2, height: 0 } }, bonus);
      }

      if (tdResult.gameOver) {
        setGameOver(true);
      }
      if (tdResult.victory) {
        setVictory(true);
      }
    }

    if (recordReplayFrame && replayRecorderRef.current?.isRecording) {
      const cs = coordinator.getState();
      replayRecorderRef.current.recordInput(
        Object.keys(activeKeys).filter((key) => activeKeys[key]),
        clickPosition || undefined,
      );
      replayRecorderRef.current.recordSnapshot({
        entities: Array.from(entities.values()).map((entity: any) => clonePreviewReplayEntity(entity)),
        stats: {
          score: cs.score,
          health: cs.health,
          mana: cs.mana,
        },
        runtime: clonePreviewReplayRuntimeSnapshot({
          projectiles,
          towers,
          ...(isTDMode ? { tdState } : {}),
          collectedRuneIds: cs.collectedItems,
          defeatedEnemies,
          invincibleTimer: localInvincibleTimer,
          lastShotTime,
          inventory: inventory.serialize(),
          quests: questMgr.serialize(),
          learnedSpells: spellMgr.serialize(),
          dialogueFlags: dialogueMgr.serialize(),
        }),
      });
    }

    if (syncUi) {
      publishTowerDefenseOverlayState();
      frameCount++;
      if (frameCount % 10 === 0 || Boolean(activeReplayPlayer)) {
        const cs = coordinator.getState();
        setPlayerScore(cs.score);
        setPlayerHealth(cs.health);
        setPlayerMana(cs.mana);
      }
      if (activeReplayPlayer) {
        syncReplayPlaybackState(activeReplayPlayer);
      }
      if (frameCount % 30 === 0) {
        const fps = frameDeltaTime > 0 ? Math.round(1000 / frameDeltaTime) : 0;
        const mem = typeof (performance as any).memory === 'object'
          ? `${(((performance as any).memory.usedJSHeapSize || 0) / 1048576) | 0}MB`
          : 'N/A';
        gameStatsRef.current = { fps, entities: entities.size + projectiles.length, memory: mem };
        setGameStats({ fps, entities: entities.size + projectiles.length, memory: mem });
      }
    }

    if (activeReplayPlayer && !activeReplayPlayer.isPlaying && activeReplayPlayer.progress >= 1) {
      setIsPlayingBack(false);
    }

    previousKeys = { ...activeKeys };
  };

  const bootstrapReplayState = () => {
    if (!replayPlayer) return;

    const targetTimeMs = replayPlayer.currentTimeMs;
    if (targetTimeMs > 0) {
      const snapshot = replayPlayer.getSnapshotBeforeOrAt(targetTimeMs);
      if (snapshot) {
        restoreReplaySnapshot(snapshot);
        replayPlayer.seekToTime(snapshot.t);
      } else {
        replayPlayer.seekToTime(0);
      }

      previousKeys = createKeyState(replayPlayer.getInputsAt(replayPlayer.currentTimeMs)?.keys ?? []);

      while (replayPlayer.currentTimeMs < targetTimeMs) {
        const stepMs = Math.min(replayPlayer.tickMs, targetTimeMs - replayPlayer.currentTimeMs);
        const replayFrame = replayPlayer.step(stepMs);
        runSimulationFrame({
          frameDeltaTime: stepMs,
          activeKeys: createKeyState(replayFrame?.keys ?? []),
          allowPanelShortcuts: false,
          clickPosition: replayFrame?.click ?? null,
          recordReplayFrame: false,
          syncUi: false,
        });
      }
    }

    replayPlayer.pause();
    if (replayAutoplay) {
      replayPlayer.play();
    }
    syncSimulationState();
    syncReplayPlaybackState(replayPlayer);
  };

  bootstrapReplayState();

  const update = () => {
    if (!gameStarted || gamePaused || gameOver || victory) return;
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - lastTime, 50);
    lastTime = currentTime;

    const activeReplayPlayer = replayPlayerRef.current;
    let replayFrame: InputFrame | null = null;
    let frameDeltaTime = deltaTime;

    if (activeReplayPlayer) {
      const pendingReplayStepMs = pendingReplayStepMsRef.current;

      if (pendingReplayStepMs > 0) {
        pendingReplayStepMsRef.current = 0;
        replayFrame = activeReplayPlayer.step(pendingReplayStepMs);
        frameDeltaTime = pendingReplayStepMs;
      } else {
        const replayTimeBefore = activeReplayPlayer.currentTimeMs;
        replayFrame = activeReplayPlayer.tick(deltaTime);
        frameDeltaTime = activeReplayPlayer.currentTimeMs - replayTimeBefore;
      }
    }

    const activeKeys = activeReplayPlayer ? createKeyState(replayFrame?.keys ?? []) : liveKeys;
    const frameClickPosition = activeReplayPlayer ? (replayFrame?.click ?? null) : pendingCanvasClick;
    pendingCanvasClick = null;

    if (activeReplayPlayer && frameDeltaTime <= 0) {
      syncReplayPlaybackState(activeReplayPlayer);
      previousKeys = { ...activeKeys };
      return;
    }

    runSimulationFrame({
      frameDeltaTime,
      activeKeys,
      activeReplayPlayer,
      clickPosition: frameClickPosition,
      recordReplayFrame: isRecording,
    });
  };

  // Read state from coordinator for rendering
  const getScore = () => coordinator.getState().score;
  const getHealth = () => coordinator.getState().health;
  const getMana = () => coordinator.getState().mana;
  const getCollectedRuneIds = () => coordinator.getState().collectedItems;
  const getGameTime = () => coordinator.getState().timeElapsed * 1000;

  const render = () => {
    const score = getScore();
    const health = getHealth();
    const mana = getMana();
    const collectedRuneIds = getCollectedRuneIds();
    const gameTime = getGameTime();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }


    // ─── TD Mode: Draw enemy path on background ───
    if (isTDMode) {
      const pathPoints = tdState.waypoints.length > 0
        ? tdState.waypoints
        : getTowerDefensePathPoints(tdState.mapLayout, canvas.width, canvas.height, coreEntity?.transform || null);
      // Draw path background (dirt road)
      ctx.save();
      ctx.strokeStyle = '#3d2b1f';
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      // Draw path center (lighter)
      ctx.strokeStyle = '#5c3d2e';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      // Draw dashed center line
      ctx.strokeStyle = 'rgba(139,115,85,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (let i = 1; i < pathPoints.length - 1; i++) {
        ctx.beginPath();
        ctx.arc(pathPoints[i].x, pathPoints[i].y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Entry arrow
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⬆ SPAWN', 100, canvas.height - 8);
      ctx.restore();
    }

    const renderLayer = (filterFn: (entity: any) => boolean, renderFn: (entity: any) => void) => {
      entities.forEach((entity: any) => {
        if (filterFn(entity)) renderFn(entity);
      });
    };

    renderLayer((entity: any) => entity.type === 'obstacle', (entity: any) => {
      const { x, y, scaleX, scaleY } = entity.transform;
      const w = entity.width;
      const h = entity.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, scaleY);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-w / 2, -h / 2, w, h * 0.2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(w / 2 - w * 0.1, -h / 2, w * 0.1, h);
      ctx.restore();
    });

    renderLayer((entity: any) => entity.type === 'npc', (entity: any) => {
      const { x, y, scaleX, scaleY } = entity.transform;
      const w = entity.width;
      const h = entity.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, scaleY);
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 10);
      ctx.fill();
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 16);
      ctx.lineTo(-w / 2 + 2, -h / 2 + 2);
      ctx.lineTo(w / 2 - 2, -h / 2 + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-w / 5, -h / 8, w / 6, 0, Math.PI * 2);
      ctx.arc(w / 5, -h / 8, w / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.arc(-w / 5, -h / 8, w / 12, 0, Math.PI * 2);
      ctx.arc(w / 5, -h / 8, w / 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(entity.components?.npc?.name || 'NPC', 0, h / 2 + 12);
      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        const pdx = player.transform.x - entity.transform.x;
        const pdy = player.transform.y - entity.transform.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 80) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('[TAB] Talk', 0, -h / 2 - 22);
        }
      }
      ctx.restore();
    });

    renderLayer((entity: any) => entity.type === 'item', (entity: any) => {
      const { x, y, rotation } = entity.transform;
      const w = entity.width;
      const h = entity.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation || 0);
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-w / 4, -h / 2 + 1, w / 2, h * 0.3);
      ctx.restore();
    });

    renderLayer((entity: any) => entity.type === 'collectible', (entity: any) => {
      const { x, y, scaleX, scaleY, rotation } = entity.transform;
      const h = entity.height;
      const w = entity.width;
      const collectible = entity.components?.collectible;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation || 0);
      ctx.scale(scaleX, scaleY);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
      gradient.addColorStop(0, `${entity.color}80`);
      gradient.addColorStop(1, `${entity.color}00`);
      ctx.fillStyle = gradient;
      ctx.fillRect(-w, -h, w * 2, h * 2);
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      if (collectible?.type === 'rune') {
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(0, h / 2);
        ctx.lineTo(-w / 2, 0);
        ctx.closePath();
      } else if (collectible?.type === 'health') {
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.fill();
      if (collectible?.type === 'rune') {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, w / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Heal pulse effect
    if (healPulse) {
      const elapsed = getGameTime() - healPulse.startTime;
      if (elapsed < healPulse.duration * 1000) {
        const progress = elapsed / (healPulse.duration * 1000);
        const radius = 40 * progress;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(healPulse.x, healPulse.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        healPulse = null;
      }
    }
    projectiles.forEach((projectile) => {
      const isTD = isTDMode && projectile.id?.startsWith('tp-');
      // Update trail for spell projectiles and TD projectiles
      if ((projectile.isSpell && projectile.trail) || isTD) {
        if (!projectile.trail) projectile.trail = [];
        projectile.trail.push({ x: projectile.x, y: projectile.y });
        if (projectile.trail.length > 6) projectile.trail.shift();
      }

      ctx.save();
      // Draw trail
      if (projectile.trail && projectile.trail.length > 1) {
        projectile.trail.forEach((point: any, i: number) => {
          const alpha = (i + 1) / projectile.trail.length * 0.35;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = projectile.color || '#fbbf24';
          ctx.beginPath();
          ctx.arc(point.x, point.y, isTD ? 4 : projectile.isSpell ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      // Main projectile body
      const radius = isTD ? 6 : projectile.isSpell ? 7 : 5;
      // Outer glow
      if (isTD) {
        ctx.fillStyle = (projectile.color || '#fbbf24') + '40';
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, radius + 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = projectile.color || '#fbbf24';
      ctx.shadowColor = projectile.color || '#fbbf24';
      ctx.shadowBlur = isTD ? 16 : projectile.isSpell ? 15 : 10;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
      ctx.fill();
      // Bright core
      if (isTD) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Death particles
    deathParticles.forEach((p) => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    renderLayer((entity: any) => entity.type === 'enemy', (entity: any) => {
      const { x, y, scaleX, scaleY } = entity.transform;
      const w = entity.width;
      const h = entity.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, scaleY);
      ctx.fillStyle = entity.hitFlash > 0 ? '#fff' : entity.color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-w / 5, -h / 5, w / 6, h / 6, 0, 0, Math.PI * 2);
      ctx.ellipse(w / 5, -h / 5, w / 6, h / 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-w / 5, -h / 5, w / 12, 0, Math.PI * 2);
  const hpPct = entity.health / entity.maxHealth;
  const barW = w + 8;
  const barH = 5;
  const barX = -w / 2 - 4;
  const barY = -h / 2 - 14;

  // Outer border
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 3);
  ctx.fill();

  // Background (dark)
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 2);
  ctx.fill();

  // Health fill with color transition
  const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillStyle = hpColor;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * hpPct, barH, 2);
  ctx.fill();

  // Shine effect on health bar
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * hpPct, Math.ceil(barH / 2), 2);
  ctx.fill();

  // HP text below bar
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 3;
  ctx.fillText(`${entity.health}/${entity.maxHealth}`, 0, barY + barH + 10);
  ctx.shadowBlur = 0;
      ctx.fillText(`${entity.health}/${entity.maxHealth}`, 0, -h / 2 - 14);
      ctx.restore();
    });

    const player = entities.get('player') || entities.get('player-1');
    if (player) {
      const { x, y, scaleX, scaleY } = player.transform;
      const w = player.width;
      const h = player.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, scaleY);
      if (localInvincibleTimer > 0 && Math.floor(localInvincibleTimer / 100) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-w / 5, -h / 6, w / 5, h / 5, 0, 0, Math.PI * 2);
      ctx.ellipse(w / 5, -h / 6, w / 5, h / 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.arc(-w / 5, -h / 6, w / 10, 0, Math.PI * 2);
      ctx.arc(w / 5, -h / 6, w / 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 10;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 2;
      ctx.fillText(isTDMode ? 'CURSOR' : 'YOU', 0, h / 2 + 12);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (isTDMode) {
      if (placementPointer.active) {
        const previewConfig = TOWER_CONFIGS[selectedTowerType.current];
        const previewPlacement = validateTowerPlacement({
          x: placementPointer.x,
          y: placementPointer.y,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          towers,
          mapLayout: tdState.mapLayout,
          corePosition: coreEntity?.transform || null,
        });
        const canAffordPreview = coordinator.getState().mana >= previewConfig.cost;
        const previewValid = previewPlacement.valid && canAffordPreview;
        ctx.save();
        ctx.translate(placementPointer.x, placementPointer.y);
        ctx.strokeStyle = previewValid ? 'rgba(96, 165, 250, 0.45)' : 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, previewConfig.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = previewValid ? 'rgba(96, 165, 250, 0.12)' : 'rgba(239, 68, 68, 0.12)';
        ctx.beginPath();
        ctx.arc(0, 0, previewConfig.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = previewValid ? 0.7 : 0.45;
        ctx.fillStyle = previewConfig.color;
        ctx.beginPath();
        ctx.roundRect(-10, -6, 20, 16, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.arc(0, -6, 8, Math.PI, 0);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = previewValid ? '#60a5fa' : '#ef4444';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, TOWER_PLACEMENT_RADIUS + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      for (const tower of towers) {
        ctx.save();
        ctx.translate(tower.x, tower.y);
        const isSelected = tower.id === selectedTowerId;
        const isHovered = tower.id === hoveredTowerId;
        // Range circle — always visible, brighter when selected/hovered
        const rangeAlpha = isSelected || isHovered ? 0.4 : 0.18;
        ctx.strokeStyle = isSelected || isHovered ? `rgba(251,191,36,${rangeAlpha})` : `rgba(210,105,30,${rangeAlpha})`;
        ctx.lineWidth = isSelected || isHovered ? 1.5 : 1;
        if (!isSelected && !isHovered) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, tower.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Tower body
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.roundRect(-10, -6, 20, 16, 3);
        ctx.fill();
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, -6, 8, Math.PI, 0);
        ctx.fill();
        // Upgrade level rings
        const levelColors = ['#94a3b8', '#22c55e', '#3b82f6', '#fbbf24'];
        for (let i = 0; i < tower.upgradeLevel; i++) {
          const ringRadius = 16 + i * 4;
          const pulse = Math.sin(performance.now() / 600 + i) * 0.2 + 0.8;
          ctx.strokeStyle = levelColors[i + 1] || '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = pulse;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Selection highlight
        if (isSelected || isHovered) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // Smoke
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        const smokeTime = performance.now() / 1000;
        ctx.beginPath();
        ctx.moveTo(-3, -12);
        ctx.quadraticCurveTo(-3 + Math.sin(smokeTime * 3) * 3, -20, -3, -26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3, -12);
        ctx.quadraticCurveTo(3 + Math.sin(smokeTime * 3 + 1) * 3, -20, 3, -26);
        ctx.stroke();
        ctx.restore();
      }

      const core = entities.get('core-bean') || entities.get('magic-bean');
      if (core && tdState.maxCoreHealth > 0) {
        const cx = core.transform.x;
        const cy = core.transform.y;
        const barW = 70;
        const barH = 8;
        // Pulsing protective aura
        const pulse = Math.sin(performance.now() / 500) * 0.3 + 0.7;
        ctx.save();
        ctx.strokeStyle = `rgba(34, 197, 94, ${pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.stroke();
        // Shield ring when health is high
        const pct = tdState.coreHealth / tdState.maxCoreHealth;
        if (pct > 0.25) {
          ctx.strokeStyle = `rgba(34, 197, 94, ${pulse * 0.15})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, 32, 0, Math.PI * 2 * pct);
          ctx.stroke();
        }
        ctx.restore();
        // Health bar
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(cx - barW / 2, cy + 36, barW, barH);
        ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(cx - barW / 2, cy + 36, barW * pct, barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - barW / 2, cy + 36, barW, barH);
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`☕ CORE: ${tdState.coreHealth}/${tdState.maxCoreHealth}`, cx, cy + 56);
      }
    }

    manaTexts.forEach((manaText) => {
      const alpha = Math.max(0, manaText.life / manaText.maxLife);
      const rise = 1 - alpha;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = `bold ${16 + rise * 2}px sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillStyle = '#60a5fa';
      ctx.shadowColor = 'rgba(96, 165, 250, 0.8)';
      ctx.shadowBlur = 10;
      ctx.strokeText(`+${manaText.amount} mana`, manaText.x, manaText.y);
      ctx.fillText(`+${manaText.amount} mana`, manaText.x, manaText.y);
      ctx.restore();
    });

    // Floating damage numbers
    damageTexts.forEach((dt) => {
      const alpha = Math.max(0, dt.life / dt.maxLife);
      const scale = 0.8 + 0.4 * (1 - alpha);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.round(14 * scale)}px monospace`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillStyle = dt.color;
      ctx.shadowColor = dt.color;
      ctx.shadowBlur = 8;
      ctx.strokeText(`-${dt.damage}`, dt.x, dt.y);
      ctx.fillText(`-${dt.damage}`, dt.x, dt.y);
      ctx.restore();
    });

    // ─── HUD (via @clawgame/engine PreviewHUD) ───
    const cs = coordinator.getState();
    const weapon = inventory.equipment.weapon;
    const selectedTower = isTDMode && selectedTowerId
      ? towers.find((t) => t.id === selectedTowerId) ?? null
      : null;
    const tdStats: HUDTowerDefenseStats | undefined = isTDMode ? {
      waveIndex: tdState.waveIndex,
      totalWaves: tdWaves.length,
      towerCount: towers.length,
      enemiesAlive: tdState.enemiesAlive,
      coreHealth: tdState.coreHealth,
      coreMaxHealth: tdState.maxCoreHealth,
      waveMessage: tdState.waveMessage || undefined,
      waveMessageAlpha: tdState.waveMessageTimer > 0 ? Math.min(1, tdState.waveMessageTimer / 1000) : undefined,
    waveCountdown: (tdState as any).waveCountdown ?? -1,
      selectedTower: selectedTower ? {
        id: selectedTower.id,
        damage: selectedTower.damage,
        range: selectedTower.range,
        fireRate: selectedTower.fireRate,
        upgradeLevel: selectedTower.upgradeLevel,
        maxUpgradeLevel: MAX_UPGRADE_LEVEL,
        upgradeCost: getUpgradeCost(selectedTower),
        sellValue: getSellValue(selectedTower),
        canUpgrade: selectedTower.upgradeLevel < MAX_UPGRADE_LEVEL,
        mana: cs.mana,
      } : null,
    } : undefined;

    const hudState: HUDState = {
      score: cs.score,
      highScore: highScoreRef?.current,
      health: cs.health,
      maxHealth: cs.maxHealth,
      mana: cs.mana,
      maxMana: cs.maxMana,
      fps: gameStatsRef.current.fps,
      entityCount: gameStatsRef.current.entities,
      timeSeconds: Math.floor(cs.timeElapsed),
      collectedRunes: cs.collectedItems.length,
      weaponName: weapon?.name,
      spells: spellMgr.learnedSpells
        .filter((spell: any) => spell.hotkey !== null)
        .map((spell: any) => ({
          icon: spell.icon,
          hotkey: spell.hotkey,
          cooldown: spell.currentCooldown,
          maxCooldown: spell.cooldown,
        })),
      questText: questHUDText || undefined,
      towerDefense: tdStats,
    };

    const minimapEntities: MinimapEntity[] = [];
    entities.forEach((entity: any) => {
      minimapEntities.push({
        x: entity.transform.x,
        y: entity.transform.y,
        type: entity.type,
      });
    });

    previewHUD.render(hudState, minimapEntities);

    if (isTDMode) {
      const manaBoxW = 184;
      const manaBoxH = 52;
      const manaBoxX = Math.min(225, Math.max(12, canvas.width - manaBoxW - 140));
      const manaBoxY = 84;
      const manaPulse = 0.55 + 0.45 * Math.sin(performance.now() / 300);

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(manaBoxX, manaBoxY, manaBoxW, manaBoxH, 10);
      ctx.fill();
      ctx.strokeStyle = `rgba(96, 165, 250, ${0.7 + manaPulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MANA', manaBoxX + 14, manaBoxY + 18);
      ctx.fillStyle = '#dbeafe';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${Math.round(mana)}`, manaBoxX + 14, manaBoxY + 41);
      ctx.fillStyle = 'rgba(191, 219, 254, 0.85)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('basic 30 • frost 40 • cannon 50 • lightning 55', manaBoxX + manaBoxW - 12, manaBoxY + 41);
      ctx.restore();

      // ── Top HUD Bar ──
      const hudBarH = 36;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, canvas.width, hudBarH);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, hudBarH);
      ctx.lineTo(canvas.width, hudBarH);
      ctx.stroke();
      ctx.restore();

      // Wave counter
      const waveDisplay = tdState.allWavesDone ? `${tdWaves.length}/${tdWaves.length}` : `${tdState.waveIndex}/${tdWaves.length}`;
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`WAVE ${waveDisplay}`, 12, 23);

      // Mana bar
      const manaBarX = 130;
      const manaBarW = 140;
      const manaBarH = 14;
      const manaBarY = 11;
      const manaFraction = Math.min(1, mana / cs.maxMana);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(manaBarX, manaBarY, manaBarW, manaBarH, 4);
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(manaBarX, manaBarY, manaBarW * manaFraction, manaBarH, 4);
      ctx.fill();
      ctx.fillStyle = '#dbeafe';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(mana)} mana`, manaBarX + manaBarW / 2, manaBarY + 11);

      // Score
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`Score: ${score}`, 290, 23);

      // Core HP bar
      const coreBarX = 420;
      const coreBarW = 160;
      const coreBarH = 14;
      const coreBarY = 11;
      const corePct = tdState.maxCoreHealth > 0 ? tdState.coreHealth / tdState.maxCoreHealth : 0;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(coreBarX, coreBarY, coreBarW, coreBarH, 4);
      ctx.fill();
      ctx.fillStyle = corePct > 0.5 ? '#22c55e' : corePct > 0.25 ? '#eab308' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(coreBarX, coreBarY, coreBarW * corePct, coreBarH, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`☕ Core: ${tdState.coreHealth}/${tdState.maxCoreHealth}`, coreBarX + coreBarW / 2, coreBarY + 11);

      // Enemies alive
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f87171';
      ctx.font = '12px monospace';
      ctx.fillText(`Enemies: ${tdState.enemiesAlive}`, canvas.width - 12, 23);
      ctx.restore();

      // ── Wave start button (when waiting for player) ──
      if (tdState.waitingForPlayer && tdState.gamePhase === 'waiting' && !tdState.allWavesDone) {
        const btnW = 220;
        const btnH = 48;
        const btnX = canvas.width / 2 - btnW / 2;
        const btnY = canvas.height / 2 - btnH / 2;
        const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 400);

        ctx.save();
        // Background
        ctx.fillStyle = `rgba(34, 197, 94, ${0.9 * pulse})`;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Border
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        const countdown = (tdState as any).waveAutoStartTimer > 0 ? Math.ceil((tdState as any).waveAutoStartTimer / 1000) : 0;
        ctx.fillText(countdown > 0 ? `▶ Wave ${tdState.waveIndex + 1} in ${countdown}s...` : `▶ Start Wave ${tdState.waveIndex + 1}`, canvas.width / 2, btnY + 30);
        // Subtitle
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '12px sans-serif';
        ctx.fillText(tdState.waveIndex === 0 && countdown > 0 ? 'Place towers now — or click to start early!' : 'Click anywhere to start', canvas.width / 2, btnY + btnH + 20);
        ctx.restore();
      }

      // ── Game Over Overlay ──
      if (tdState.gamePhase === 'gameover') {
        ctx.save();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '16px sans-serif';
        ctx.fillText('Click anywhere to play again', canvas.width / 2, canvas.height / 2 + 50);
        ctx.restore();
      }

      // ── Victory Overlay ──
      if (tdState.gamePhase === 'victory') {
        ctx.save();
        ctx.fillStyle = 'rgba(22, 163, 74, 0.65)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '16px sans-serif';
        ctx.fillText('Click anywhere to play again', canvas.width / 2, canvas.height / 2 + 50);
        ctx.restore();
      }

      // ── Status bar ──
      {
        const dbgEnemies = Array.from(entities.values()).filter(e => e.type === 'enemy').length;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        const statusParts = [
          `☕ Wave ${tdState.waveIndex}/${tdWaves.length}`,
          `🏰 Towers: ${towers.length}`,
          `👾 Enemies: ${dbgEnemies}`,
          `❤️ Core: ${tdState.coreHealth}/${tdState.maxCoreHealth}`,
        ];
        if (tdState.waveCountdown > 0) {
          statusParts.push(`⏱ Next wave: ${tdState.waveCountdown}s`);
        }
        ctx.fillText(statusParts.join('  |  '), 8, canvas.height - 6);
        ctx.restore();
      }
    }
  };

  const gameLoop = () => {
    update();
    render();
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  animationRef.current = requestAnimationFrame(gameLoop);

  return () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    window.removeEventListener('resize', resizeCanvas);
    resizeObserver.disconnect();
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('mousemove', handleCanvasMouseMove);
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.removeEventListener('touchmove', handleCanvasTouch);
    canvas.removeEventListener('touchstart', handleCanvasTouchStart);
    window.removeEventListener('keyup', handleKeyUp);
    collisionSubscriptions.forEach((subscription) => subscription.unsubscribe());
    coordinatorSubscriptions.forEach((subscription) => subscription.unsubscribe());
    coordinator.reset();
    setTowerDefenseOverlayState?.(DEFAULT_TOWER_DEFENSE_OVERLAY_STATE);
    if (replayPlayerRef.current === replayPlayer) {
      replayPlayerRef.current = null;
    }
    if (runtimeHost) {
      delete runtimeHost.dataset.previewRuntimeActive;
      delete runtimeHost.dataset.previewRuntimeMounted;
    }
  };
}
