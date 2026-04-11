/**
 * @clawgame/web - Game Preview Hook
 * Extracted from GamePreviewPage: game loop, RPG state, and event handlers.
 *
 * Fixed in v0.13.5:
 * - Added default scene with player entity when projectScene is null/empty
 * - Fixed empty canvas issue by always ensuring entities are available
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeNotifications } from '../rpg/notifications';
import { SPELL_RECIPES } from '../rpg/data/recipes';
import type { GameNotification, ElementType } from '../rpg/types';
import { type ProjectScene } from './useSceneLoader';
import { type UIPanel, type SaveSlotInfo } from '../components/game/RPGPanels';
import { InventoryManager } from '../rpg/inventory';
import { QuestManager } from '../rpg/quests';
import { DialogueManager } from '../rpg/dialogue';
import { SpellCraftingManager } from '../rpg/spellcrafting';
import { SaveLoadManager } from '../rpg/saveload';
import { createDefaultPreviewScene } from '../utils/previewScene';
import { ReplayRecorder, ReplayPlayer, downloadReplay, type ReplayData, type InputFrame } from '../rpg/replay';
import { AISystem, CollisionSystem, EventBus, MovementSystem, PhysicsSystem, ProjectileSystem } from '@clawgame/engine';
import { createPreviewCollisionScene } from '../utils/previewCollisionScene';
import { applyPreviewRuntimeScene, createPreviewRuntimeScene, toEngineInputState } from '../utils/previewRuntimeScene';
import { applyPreviewProjectileScene, createPreviewProjectileScene } from '../utils/previewProjectileScene';
import { createTowerDefenseState, createTowerDefenseTower, getTowerDefenseWaves, registerTowerDefenseEnemyDefeat, updateTowerDefenseFrame, type TowerDefenseTower } from '../utils/previewTowerDefense';

/* ─── Types ─── */
export interface GameStats { fps: number; entities: number; memory: string; }

/* ─── Entity type constants ─── */
const TYPE_COLORS: Record<string, string> = {
  player: '#3b82f6', enemy: '#ef4444', collectible: '#f59e0b',
  obstacle: '#64748b', npc: '#22c55e', unknown: '#8b5cf6',
};
const TYPE_SIZES: Record<string, [number, number]> = {
  player: [32, 48], enemy: [32, 32], collectible: [16, 16],
  obstacle: [32, 32], npc: [32, 48], unknown: [32, 32],
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

/* ─── Genre-specific control text ─── */
export const GENRE_CONTROLS: Record<string, {
  title: string;
  description: string;
  items: { icon: string; text: string }[];
}> = {
  platformer: {
    title: 'Platformer', description: 'Jump between platforms, collect items, and reach the goal!',
    items: [
      { icon: '🎯', text: 'WASD/Arrows to move and jump' },
      { icon: '💎', text: 'Collect coins and gems' },
      { icon: '🏁', text: 'Reach the exit door' },
    ],
  },
  rpg: {
    title: 'RPG', description: 'Explore, talk to NPCs, complete quests, and defeat enemies!',
    items: [
      { icon: '🎯', text: 'WASD/Arrows to move' },
      { icon: '🔥', text: 'SPACE to shoot/projectile' },
      { icon: '💎', text: 'Collect runes to win' },
      { icon: '🧙', text: 'TAB to talk to NPCs' },
      { icon: '🎒', text: 'I: Inventory, J: Quests, C: Craft' },
      { icon: '💾', text: 'F5: Quick Save, ESC: Menu' },
    ],
  },
  action: {
    title: 'Action', description: 'Defeat enemies, dodge attacks, and survive!',
    items: [
      { icon: '🎯', text: 'WASD/Arrows to move' },
      { icon: '🔥', text: 'SPACE to shoot' },
      { icon: '💀', text: 'Defeat all enemies' },
    ],
  },
  puzzle: {
    title: 'Puzzle', description: 'Solve puzzles and find the solution!',
    items: [
      { icon: '🎯', text: 'WASD/Arrows to move' },
      { icon: '🧩', text: 'Interact with objects' },
      { icon: '💡', text: 'Find the pattern' },
    ],
  },
  strategy: {
    title: 'Tower Defense', description: 'Defend the Sacred Bean from caffeine-crazed office workers!',
    items: [
      { icon: '🎯', text: 'WASD to move your espresso machine' },
      { icon: '☕', text: 'SPACE to shoot espresso shots' },
      { icon: '🏗️', text: 'T to place a Coffee Trap tower (30 mana)' },
      { icon: '🛡️', text: 'Defend the Sacred Bean at all costs!' },
    ],
  },
  default: {
    title: 'Game', description: 'Use WASD/Arrow keys to move and SPACE to interact!',
    items: [
      { icon: '🎯', text: 'WASD/Arrows to move' },
      { icon: '🔥', text: 'SPACE to interact/attack' },
      { icon: '⌨️', text: 'ESC to pause' },
    ],
  },
};

export function useGamePreview(
  projectId: string | undefined,
  projectScene: ProjectScene | null,
  projectGenre: string,
) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const gameLoopState = useRef<any>(null);

  // Use projectScene if available and has entities, otherwise use default
  const activeScene = (projectScene && projectScene.entities && projectScene.entities.length > 0)
    ? projectScene
    : createDefaultPreviewScene();

  /* ─── Game state ─── */
  const [gameStats, setGameStats] = useState<GameStats>({ fps: 60, entities: 0, memory: 'N/A' });
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [collectedRunes, setCollectedRunes] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);

  /* RPG panel state */
  const [activePanel, setActivePanel] = useState<UIPanel>('none');
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [questList, setQuestList] = useState<any[]>([]);
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueSpeaker, setDialogueSpeaker] = useState('');
  const [dialoguePortrait, setDialoguePortrait] = useState('');
  const [dialogueChoices, setDialogueChoices] = useState<{ text: string; index: number }[]>([]);
  const [craftingGrid, setCraftingGrid] = useState<(ElementType | null)[][]>([[null,null,null],[null,null,null],[null,null,null]]);
  const [craftResult, setCraftResult] = useState<string | null>(null);
  const [learnedSpells, setLearnedSpells] = useState<any[]>([]);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [questHUDText, setQuestHUDText] = useState('');

  /* RPG managers (refs to survive re-renders) */
  const inventoryRef = useRef<InventoryManager>(new InventoryManager() as any);
  const questMgrRef = useRef<QuestManager>(new QuestManager() as any);
  const dialogueMgrRef = useRef<DialogueManager>(new DialogueManager() as any);
  const spellMgrRef = useRef<SpellCraftingManager>(new SpellCraftingManager() as any);
  const saveMgrRef = useRef<SaveLoadManager>(new SaveLoadManager() as any);
  const replayRecorderRef = useRef<ReplayRecorder | null>(projectId ? new ReplayRecorder(projectId) : null);
  const replayPlayerRef = useRef<ReplayPlayer | null>(null);
  const replayDataRef = useRef<ReplayData | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasReplay, setHasReplay] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [replaySessionKey, setReplaySessionKey] = useState(0);
  const [replayAutoplay, setReplayAutoplay] = useState(false);

  const controls = GENRE_CONTROLS[projectGenre] || GENRE_CONTROLS.default;

  useEffect(() => {
    replayRecorderRef.current = projectId ? new ReplayRecorder(projectId) : null;
    replayPlayerRef.current = null;
    replayDataRef.current = null;
    setIsRecording(false);
    setRecordingTime(0);
    setHasReplay(false);
    setPlaybackTime(0);
    setPlaybackProgress(0);
    setIsPlayingBack(false);
    setReplaySessionKey(0);
    setReplayAutoplay(false);
  }, [projectId]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const interval = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  /* ─── Notification subscription ─── */
  useEffect(() => {
    const unsub = subscribeNotifications((n: GameNotification) => {
      setNotifications(prev => [...prev, n]);
      setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), n.duration);
    });
    return unsub;
  }, []);

  /* ─── Sync RPG state to React ─── */
  const syncRPGState = useCallback(() => {
    const inv = inventoryRef.current as any;
    const qm = questMgrRef.current as any;
    const sm = spellMgrRef.current as any;
    setInventoryItems(inv.items.map((i: any) => ({ ...i })));
    setQuestList(qm.quests.map((q: any) => ({ ...q, objectives: q.objectives.map((o: any) => ({ ...o })) })));
    setLearnedSpells(sm.learnedSpells.map((s: any) => ({ ...s })));
  }, []);

  const refreshSaveSlots = useCallback(() => {
    const sm = saveMgrRef.current as any;
    const slots: SaveSlotInfo[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        const data = sm.load(i);
        slots.push(data ? { ...data, id: i } : { id: i, empty: true });
      } catch { slots.push({ id: i, name: 'Empty', timestamp: 0, playTime: 0 }); }
    }
    setSaveSlots(slots);
  }, []);

  /* ─── RPG Event Handlers ─── */
  const handleUseItem = useCallback((itemId: string) => {
    const inv = inventoryRef.current as any;
    const item = inv.items.find((i: any) => i.id === itemId);
    if (!item) return;
    if (item.type === 'potion' && item.stats?.heal) {
      const gls = gameLoopState.current;
      if (gls) {
        const h = Math.min(100, gls.getHealth() + item.stats.heal);
        gls.setHealth(h);
      }
    }
    inv.removeItem(itemId);
    syncRPGState();
  }, [syncRPGState]);

  const handleEquipItem = useCallback((itemId: string) => {
    const inv = inventoryRef.current as any;
    const item = inv.items.find((i: any) => i.id === itemId);
    if (!item || !item.equippable) return;
    inv.equipItem(itemId);
    syncRPGState();
  }, [syncRPGState]);

  const handleCraftingCell = useCallback((row: number, col: number) => {
    setCraftingGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = next[row][col] ? null : 'fire';
      return next;
    });
  }, []);

  const handleLearnSpell = useCallback(() => {
    const mgr = spellMgrRef.current as any;
    const flat = craftingGrid.flat().filter(Boolean) as ElementType[];
    if (flat.length < 3) return;
    // Match recipe by element type (simplified from original any-typed logic)
    const match = (SPELL_RECIPES as any[]).find((r: any) => {
      if (r.elements) {
        const rFlat = [...r.elements].sort().join(',');
        return rFlat === flat.sort().join(',');
      }
      return r.element && flat.includes(r.element);
    });
    if (match) {
      const spellData = match.resultSpell || match;
      if (!mgr.learnedSpells.some((s: any) => s.id === spellData.id)) {
        mgr.learnSpell(spellData);
        setCraftResult(spellData.name);
        setCraftingGrid([[null,null,null],[null,null,null],[null,null,null]]);
        syncRPGState();
      } else {
        setCraftResult('Already learned');
      }
    } else {
      setCraftResult('No recipe found');
    }
    setTimeout(() => setCraftResult(null), 2000);
  }, [craftingGrid, syncRPGState]);

  const handleAssignHotkey = useCallback((spellId: string, hotkey: number | null) => {
    (spellMgrRef.current as any).assignHotkey(spellId, hotkey);
    syncRPGState();
  }, [syncRPGState]);

  const handleSave = useCallback((slotId: number) => {
    const gls = gameLoopState.current;
    if (!gls) return;
    (saveMgrRef.current as any).save(slotId, {
      playerName: 'Hero',
      health: gls.getHealth(),
      mana: gls.getMana(),
      score: gls.getScore(),
      inventory: (inventoryRef.current as any).serialize(),
      quests: (questMgrRef.current as any).serialize(),
      timestamp: Date.now(),
    });
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  const handleLoad = useCallback((slotId: number) => {
    const data = (saveMgrRef.current as any).load(slotId);
    if (!data) return;
    const gls = gameLoopState.current;
    if (gls) {
      gls.setHealth(data.health || data.playerHealth || 100);
      gls.setMana(data.mana || 100);
      gls.setScore(data.score || data.playerScore || 0);
    }
    if (data.inventory) (inventoryRef.current as any).load(data.inventory);
    if (data.quests) (questMgrRef.current as any).load(data.quests);
    syncRPGState();
    setGamePaused(false);
    setActivePanel('none');
  }, [syncRPGState]);

  const handleDeleteSave = useCallback((slotId: number) => {
    (saveMgrRef.current as any).deleteSave(slotId);
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  const handlePauseResume = useCallback(() => {
    setGamePaused(prev => !prev);
  }, []);

  const handleDialogueChoice = useCallback((index: number | undefined) => {
    const mgr = dialogueMgrRef.current as any;
    if (index !== undefined) {
      mgr.advance(index);
    } else {
      mgr.advance();
    }
    const line = mgr.getCurrentLine();
    if (line) {
      setDialogueSpeaker(line.speaker);
      setDialoguePortrait(line.portrait || '💬');
      setDialogueText(line.text);
      const choices = mgr.getChoices();
      setDialogueChoices(choices.map((c: any, i: number) => ({ text: c.text, index: i })));
    } else {
      mgr.endDialogue();
      setActivePanel('none');
    }
  }, []);

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
  }, []);

  const handleRestart = useCallback(() => {
    setGameOver(false);
    setVictory(false);
    setGameStarted(false);
    setGamePaused(false);
    setPlayerScore(0);
    setPlayerHealth(100);
    setPlayerMana(100);
    setCollectedRunes([]);
    setTimeElapsed(0);
    setActivePanel('none');
    replayPlayerRef.current = null;
    setPlaybackTime(0);
    setPlaybackProgress(0);
    setIsPlayingBack(false);
    setReplaySessionKey(0);
    setReplayAutoplay(false);
  }, []);

  const handleBackToEditor = useCallback(() => {
    if (projectId) navigate(`/project/${projectId}/scene-editor`);
  }, [projectId, navigate]);

  const beginReplaySession = useCallback((autoplay: boolean) => {
    if (!replayDataRef.current) return;
    setReplayAutoplay(autoplay);
    setReplaySessionKey((prev) => prev + 1);
    setPlaybackTime(0);
    setPlaybackProgress(0);
    setIsPlayingBack(autoplay);
    setGameStarted(true);
    setGamePaused(false);
    setGameOver(false);
    setVictory(false);
    setPlayerScore(0);
    setPlayerHealth(100);
    setPlayerMana(100);
    setCollectedRunes([]);
    setTimeElapsed(0);
    setActivePanel('none');
  }, []);

  const handleToggleRecording = useCallback(() => {
    const recorder = replayRecorderRef.current;
    if (!recorder) return;

    if (isRecording) {
      const data = recorder.stop();
      replayDataRef.current = data;
      replayPlayerRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      setHasReplay(true);
      setPlaybackTime(0);
      setPlaybackProgress(0);
      setIsPlayingBack(false);
      downloadReplay(data);
      return;
    }

    replayPlayerRef.current = null;
    replayDataRef.current = null;
    setHasReplay(false);
    setPlaybackTime(0);
    setPlaybackProgress(0);
    setIsPlayingBack(false);
    setReplaySessionKey(0);
    setReplayAutoplay(false);
    recorder.start();
    setRecordingTime(0);
    setIsRecording(true);
  }, [isRecording]);

  const handlePlayReplay = useCallback(() => {
    if (!replayDataRef.current) return;

    const activePlayer = replayPlayerRef.current;
    if (activePlayer && playbackProgress > 0 && playbackProgress < 1) {
      activePlayer.play();
      setIsPlayingBack(true);
      setGamePaused(false);
      return;
    }

    beginReplaySession(true);
  }, [beginReplaySession, playbackProgress]);

  const handlePauseReplay = useCallback(() => {
    replayPlayerRef.current?.pause();
    setIsPlayingBack(false);
  }, []);

  const handleResetReplay = useCallback(() => {
    if (!replayDataRef.current) return;
    beginReplaySession(false);
  }, [beginReplaySession]);

  const handleDownloadReplay = useCallback(() => {
    if (replayDataRef.current) {
      downloadReplay(replayDataRef.current);
    }
  }, []);

  /* ─── Game loop ─── */
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) { canvas.width = container.clientWidth; canvas.height = container.clientHeight; }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const replayPlayer = replaySessionKey > 0 && replayDataRef.current
      ? new ReplayPlayer(replayDataRef.current)
      : null;
    replayPlayerRef.current = replayPlayer;
    if (replayPlayer && replayAutoplay) {
      replayPlayer.play();
    }
    const collisionBus = new EventBus();
    const collisionSystem = new CollisionSystem();
    collisionSystem.attach(collisionBus);
    const aiSystem = new AISystem();
    const movementSystem = new MovementSystem({ width: canvas.width, height: canvas.height });
    const physicsSystem = new PhysicsSystem({ width: canvas.width, height: canvas.height });
    const projectileSystem = new ProjectileSystem({ width: canvas.width, height: canvas.height });
    projectileSystem.attach(collisionBus);

    /* Init entities */
    const entities = new Map<string, any>();
    for (const entity of activeScene.entities) {
      const t = entity.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 };
      const eType = entity.type || 'unknown';
      const defaultSize = TYPE_SIZES[eType] || [32, 32];
      const comps = entity.components || {};
      entities.set(entity.id, {
        id: entity.id, type: eType, transform: { ...t },
        components: comps, vx: 0, vy: 0,
        color: comps.sprite?.color || TYPE_COLORS[eType] || '#8b5cf6',
        width: comps.sprite?.width || defaultSize[0],
        height: comps.sprite?.height || defaultSize[1],
        health: comps.stats?.hp || 30,
        maxHealth: comps.stats?.maxHp || 30,
        damage: comps.stats?.damage || 10,
        enemyType: comps?.enemyType || comps?.ai?.type || 'slime',
        patrolOrigin: { x: t.x, y: t.y },
        patrolOffset: Math.random() * Math.PI * 2,
        hitFlash: 0, facing: 'right',
      });
    }

    const liveKeys: Record<string, boolean> = {};
    let previousKeys: Record<string, boolean> = {};
    const projectiles: any[] = [];
    let frameCount = 0, lastTime = performance.now(), lastShotTime = 0;
    let score = 0, health = 100, mana = 100, invincibleTimer = 0, gameTime = 0;
    const collectedRuneIds: string[] = [];
    const defeatedEnemies: string[] = [];

    /* ═══ TOWER DEFENSE MODE (strategy genre) ═══ */
    const isTDMode = projectGenre === 'strategy';
    const towers: TowerDefenseTower[] = [];
    const tdWaves = getTowerDefenseWaves(activeScene as any);
    const coreEntity = isTDMode ? Array.from(entities.values()).find((e: any) => e.id === 'core-bean') : null;
    const tdState = createTowerDefenseState(coreEntity?.health || coreEntity?.maxHealth || 0);

    const inventory = inventoryRef.current as any;
    const questMgr = questMgrRef.current as any;
    const dialogueMgr = dialogueMgrRef.current as any;
    const spellMgr = spellMgrRef.current as any;

    if (activeScene.dialogueTrees) {
      activeScene.dialogueTrees.forEach((dt: any) => dialogueMgr.registerTree(dt));
    }

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
          score += value || 10;
        } else if (type === 'health') {
          health = Math.min(100, health + (collectible.components?.collectible?.healAmount || 30));
          score += value || 30;
        } else if (type === 'rune') {
          if (!collectedRuneIds.includes(collectibleId)) {
            collectedRuneIds.push(collectibleId);
            score += value || 25;
            setCollectedRunes([...collectedRuneIds]);
          }
        } else {
          score += value || 10;
        }

        entities.delete(collectibleId);
      }),
      collisionBus.on('collision:damage', ({ damage }) => {
        if (invincibleTimer > 0) return;
        health -= damage;
        invincibleTimer = 1000;
        if (health <= 0) {
          health = 0;
          setGameOver(true);
        }
      }),
      collisionBus.on('projectile:hit', ({ targetId, targetType, damage }) => {
        if (targetType !== 'enemy') return;

        const enemy = entities.get(targetId);
        if (!enemy) return;

        enemy.health -= damage;
        enemy.hitFlash = 200;
        if (enemy.health <= 0) {
          score += enemy.scoreValue || 50;
          defeatedEnemies.push(enemy.id);
          questMgr.onKill(enemy.enemyType || 'slime');
          if (isTDMode) {
            registerTowerDefenseEnemyDefeat(tdState);
          }
          syncRPGState();
          entities.delete(enemy.id);
        }
      }),
      collisionBus.on('collision:trigger', ({ event }) => {
        if (event === 'level_complete' || event === 'victory') {
          setVictory(true);
        }
      }),
    ];

    inventory.addItem({
      id: 'health-potion', name: 'Health Potion', description: 'Restores 25 HP.',
      type: 'potion', rarity: 'common', icon: '🧪', stackable: true, quantity: 2, maxStack: 10,
      stats: { heal: 25 }, usable: true, equippable: false, sellValue: 3,
    });

    gameLoopState.current = {
      entities, getHealth: () => health, setHealth: (h: number) => { health = h; },
      getMana: () => mana, setMana: (m: number) => { mana = m; },
      getScore: () => score, setScore: (s: number) => { score = s; },
      getGameTime: () => gameTime, getCollectedRunes: () => collectedRuneIds,
      getDefeatedEnemies: () => defeatedEnemies,
      getPlayer: () => entities.get('player') || entities.get('player-1'),
      inventory, questMgr, dialogueMgr, spellMgr, canvas,
    };

    /* ─── Input ─── */
    const handleKeyDown = (e: KeyboardEvent) => {
      const normalizedKey = normalizeInputKey(e.key);
      liveKeys[normalizedKey] = true;
      if (normalizedKey === 'space' || normalizedKey === 'tab' || normalizedKey === 'escape' || normalizedKey === 'f5' || normalizedKey.startsWith('arrow')) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      liveKeys[normalizeInputKey(e.key)] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    /* ─── UPDATE ─── */
    const update = () => {
      if (!gameStarted || gamePaused || gameOver || victory) return;
      const currentTime = performance.now();
      const deltaTime = Math.min(currentTime - lastTime, 50);
      lastTime = currentTime;
      const activeReplayPlayer = replayPlayerRef.current;
      const replayFrame: InputFrame | null = activeReplayPlayer ? activeReplayPlayer.tick(deltaTime) : null;
      const activeKeys = activeReplayPlayer ? createKeyState(replayFrame?.keys ?? []) : liveKeys;
      const panelOpen = PANEL_KEYS.includes(
        document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none'
      );
      const wasJustPressed = (key: string) => isKeyJustPressed(activeKeys, previousKeys, key);
      gameTime += deltaTime;
      setTimeElapsed(Math.floor(gameTime / 1000));

      if (invincibleTimer > 0) invincibleTimer -= deltaTime;
      mana = Math.min(100, mana + deltaTime * 0.01);
      spellMgr.tickCooldowns(deltaTime);

      if (wasJustPressed('escape')) {
        setActivePanel((prev) => {
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
        if (currentTime - lastShotTime > 300) {
          const player = entities.get('player') || entities.get('player-1');
          if (player) {
            const { dx, dy } = getMovementDirection(activeKeys);
            projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              x: player.transform.x, y: player.transform.y,
              vx: (dx || 1) * 500, vy: dy * 500,
              damage: inventory.getWeaponDamage(),
              color: '#fbbf24', createdAt: currentTime,
            });
            lastShotTime = currentTime;
          }
        }
      }

      if (wasJustPressed('t') && isTDMode) {
        const player = entities.get('player') || entities.get('player-1');
        if (player && mana >= 30) {
          mana -= 30;
          towers.push(createTowerDefenseTower(player));
        }
      }

      if (wasJustPressed('i')) { setActivePanel((p) => p === 'inventory' ? 'none' : 'inventory'); syncRPGState(); previousKeys = { ...activeKeys }; return; }
      if (wasJustPressed('j')) { setActivePanel((p) => p === 'quests' ? 'none' : 'quests'); syncRPGState(); previousKeys = { ...activeKeys }; return; }
      if (wasJustPressed('c')) { setActivePanel((p) => p === 'spellcraft' ? 'none' : 'spellcraft'); syncRPGState(); previousKeys = { ...activeKeys }; return; }
      if (wasJustPressed('f5')) { handleSave(0); previousKeys = { ...activeKeys }; return; }
      if (wasJustPressed('tab')) {
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const npcs = Array.from(entities.values()).filter((e: any) => e.type === 'npc');
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
                  setDialogueChoices(choices.map((c: any, i: number) => ({ text: c.text, index: i })));
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
          mana -= spell.manaCost;
          if (mana < 0) mana = 0;
          const player = entities.get('player') || entities.get('player-1');
          if (player) {
            const { dx, dy } = getMovementDirection(activeKeys);
            if (spell.effectType === 'heal') {
              health = Math.min(100, health + spell.damage);
            } else if (spell.effectType === 'projectile') {
              projectiles.push({
                id: `spell-${Date.now()}-${Math.random()}`,
                x: player.transform.x, y: player.transform.y,
                vx: (dx || 1) * spell.projectileSpeed,
                vy: dy * spell.projectileSpeed,
                damage: spell.damage, color: spell.projectileColor,
                createdAt: performance.now(), isSpell: true,
              });
            }
          }
          syncRPGState();
        }
      }

      projectileSystem.setWorldBounds({ width: canvas.width, height: canvas.height });
      const projectileScene = createPreviewProjectileScene(projectiles, entities.values());
      projectileSystem.update(projectileScene, deltaTime / 1000);
      applyPreviewProjectileScene(projectileScene, projectiles);

      if (!isTDMode) {
        movementSystem.setWorldBounds({ width: canvas.width, height: canvas.height });
        physicsSystem.setWorldBounds({ width: canvas.width, height: canvas.height });
        const runtimeScene = createPreviewRuntimeScene(entities.values(), { isTowerDefense: false });
        aiSystem.update(runtimeScene, deltaTime / 1000);
        movementSystem.update(runtimeScene, toEngineInputState(activeKeys), deltaTime / 1000);
        physicsSystem.update(runtimeScene, deltaTime / 1000);
        applyPreviewRuntimeScene(runtimeScene, entities);
      }

      entities.forEach((entity: any) => {
        if (entity.type === 'enemy' && entity.hitFlash > 0) {
          entity.hitFlash -= deltaTime;
        }

        if (entity.type === 'collectible' || entity.type === 'item') {
          entity.transform.rotation = (entity.transform.rotation || 0) + deltaTime * 0.003;
        }
      });

      collisionSystem.update(
        createPreviewCollisionScene(entities.values(), inventory.getArmorDefense()),
      );

      const allRunes = activeScene.entities.filter(e => e.type === 'collectible' && e.components?.collectible?.type === 'rune');
      if (allRunes.length > 0 && collectedRuneIds.length >= allRunes.length) setVictory(true);


      /* ═══ TD WAVE SPAWNING ═══ */
      if (isTDMode) {
        const tdResult = updateTowerDefenseFrame({
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          currentTime,
          deltaTime,
          entities,
          towers,
          projectiles,
          state: tdState,
          waves: tdWaves,
        });
        if (tdResult.gameOver) {
          setGameOver(true);
        }
        if (tdResult.victory) {
          setVictory(true);
        }
      }

      if (isRecording && replayRecorderRef.current?.isRecording) {
        replayRecorderRef.current.recordInput(Object.keys(activeKeys).filter((key) => activeKeys[key]));
        replayRecorderRef.current.recordSnapshot(
          Array.from(entities.values()).map((entity: any) => ({
            id: entity.id,
            transform: { x: entity.transform.x, y: entity.transform.y },
          })),
          {
            score,
            health,
            mana,
            time: Math.floor(gameTime / 1000),
          },
        );
      }

      frameCount++;
      if (frameCount % 10 === 0) { setPlayerScore(score); setPlayerHealth(health); setPlayerMana(mana); }
      if (frameCount % 10 === 0 && activeReplayPlayer) {
        setPlaybackTime(Math.round(activeReplayPlayer.progress * activeReplayPlayer.durationMs / 1000));
        setPlaybackProgress(activeReplayPlayer.progress);
        setIsPlayingBack(activeReplayPlayer.isPlaying);
      }
      if (frameCount % 30 === 0) {
        const fps = Math.round(1000 / deltaTime);
        const mem = typeof (performance as any).memory === 'object'
          ? `${((performance as any).memory.usedJSHeapSize || 0) / 1048576 | 0}MB` : 'N/A';
        gameStatsRef.current = { fps, entities: entities.size + projectiles.length, memory: mem };
        setGameStats({ fps, entities: entities.size + projectiles.length, memory: mem });
      }

      if (activeReplayPlayer && !activeReplayPlayer.isPlaying && activeReplayPlayer.progress >= 1) {
        setIsPlayingBack(false);
      }

      previousKeys = { ...activeKeys };
    };

    /* ─── RENDER ─── */
    const render = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)'; ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

      const renderLayer = (filterFn: (e: any) => boolean, renderFn: (e: any) => void) => {
        entities.forEach((e: any) => { if (filterFn(e)) renderFn(e); });
      };

      renderLayer((e: any) => e.type === 'obstacle', (entity: any) => {
        const { x, y, scaleX, scaleY } = entity.transform; const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        ctx.fillStyle = '#475569'; ctx.fillRect(-w/2, -h/2, w, h);
        ctx.fillStyle = '#64748b'; ctx.fillRect(-w/2, -h/2, w, h * 0.2);
        ctx.fillStyle = '#334155'; ctx.fillRect(w/2 - w*0.1, -h/2, w*0.1, h);
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'npc', (entity: any) => {
        const { x, y, scaleX, scaleY } = entity.transform; const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        ctx.fillStyle = entity.color;
        ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 10); ctx.fill();
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath(); ctx.moveTo(0, -h/2 - 16); ctx.lineTo(-w/2 + 2, -h/2 + 2); ctx.lineTo(w/2 - 2, -h/2 + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-w/5, -h/8, w/6, 0, Math.PI*2); ctx.arc(w/5, -h/8, w/6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath(); ctx.arc(-w/5, -h/8, w/12, 0, Math.PI*2); ctx.arc(w/5, -h/8, w/12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e9d5ff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(entity.components?.npc?.name || 'NPC', 0, h/2 + 12);
        const player = entities.get('player') || entities.get('player-1');
        if (player) {
          const pdx = player.transform.x - entity.transform.x; const pdy = player.transform.y - entity.transform.y;
          if (Math.sqrt(pdx*pdx+pdy*pdy) < 80) { ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('[TAB] Talk', 0, -h/2 - 22); }
        }
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'item', (entity: any) => {
        const { x, y, rotation } = entity.transform; const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0);
        ctx.fillStyle = entity.color; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w/4, -h/2+1, w/2, h*0.3);
        ctx.restore();
      });

      renderLayer((e: any) => e.type === 'collectible', (entity: any) => {
        const { x, y, scaleX, scaleY, rotation } = entity.transform; const w = entity.width, h = entity.height;
        const col = entity.components?.collectible;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0); ctx.scale(scaleX, scaleY);
        const grad = ctx.createRadialGradient(0,0,0,0,0,w);
        grad.addColorStop(0, entity.color + '80'); grad.addColorStop(1, entity.color + '00');
        ctx.fillStyle = grad; ctx.fillRect(-w, -h, w*2, h*2);
        ctx.fillStyle = entity.color; ctx.beginPath();
        if (col?.type === 'rune') { ctx.moveTo(0,-h/2); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2); ctx.lineTo(-w/2,0); ctx.closePath(); }
        else if (col?.type === 'health') { ctx.arc(0,0,w/2,0,Math.PI*2); }
        else { ctx.fillRect(-w/2,-h/2,w,h); }
        ctx.fill();
        if (col?.type === 'rune') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(0,0,w/4,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
      });

      projectiles.forEach(proj => {
        ctx.save(); ctx.fillStyle = proj.color || '#fbbf24'; ctx.shadowColor = proj.color || '#fbbf24';
        ctx.shadowBlur = proj.isSpell ? 15 : 10;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.isSpell ? 7 : 5, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });

      renderLayer((e: any) => e.type === 'enemy', (entity: any) => {
        const { x, y, scaleX, scaleY } = entity.transform; const w = entity.width, h = entity.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        ctx.fillStyle = entity.hitFlash > 0 ? '#fff' : entity.color;
        ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 6); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.ellipse(w/5, -h/5, w/6, h/6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-w/5, -h/5, w/12, 0, Math.PI*2); ctx.arc(w/5, -h/5, w/12, 0, Math.PI*2); ctx.fill();
        const hpPct = entity.health / entity.maxHealth;
        ctx.fillStyle = '#1f2937'; ctx.fillRect(-w/2-4, -h/2-10, w+8, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(-w/2-4, -h/2-10, (w+8)*hpPct, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${entity.health}/${entity.maxHealth}`, 0, -h/2-14);
        ctx.restore();
      });

      const player = entities.get('player') || entities.get('player-1');
      if (player) {
        const { x, y, scaleX, scaleY } = player.transform; const w = player.width, h = player.height;
        ctx.save(); ctx.translate(x, y); ctx.scale(scaleX, scaleY);
        if (invincibleTimer > 0 && Math.floor(invincibleTimer / 100) % 2 === 0) ctx.globalAlpha = 0.5;
        ctx.fillStyle = player.color; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 8); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-w/5, -h/6, w/5, h/5, 0, 0, Math.PI*2); ctx.ellipse(w/5, -h/6, w/5, h/5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath(); ctx.arc(-w/5, -h/6, w/10, 0, Math.PI*2); ctx.arc(w/5, -h/6, w/10, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10;
        ctx.strokeRect(-w/2, -h/2, w, h); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 2; ctx.fillText('YOU', 0, h/2+12); ctx.shadowBlur = 0;
        ctx.restore();
      }


      /* ═══ TD TOWER RENDERING ═══ */
      if (isTDMode) {
        for (const tower of towers) {
          ctx.save(); ctx.translate(tower.x, tower.y);
          ctx.strokeStyle = 'rgba(210,105,30,0.15)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, 0, tower.range, 0, Math.PI*2); ctx.stroke();
          ctx.fillStyle = '#D2691E';
          ctx.beginPath(); ctx.roundRect(-10, -6, 20, 16, 3); ctx.fill();
          ctx.fillStyle = '#8B4513';
          ctx.beginPath(); ctx.arc(0, -6, 8, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
          const st = performance.now() / 1000;
          ctx.beginPath(); ctx.moveTo(-3, -12); ctx.quadraticCurveTo(-3+Math.sin(st*3)*3, -20, -3, -26); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(3, -12); ctx.quadraticCurveTo(3+Math.sin(st*3+1)*3, -20, 3, -26); ctx.stroke();
          ctx.restore();
        }
        // Core health bar
        const core = entities.get('core-bean');
        if (core && tdState.maxCoreHealth > 0) {
          const cx = core.transform.x, cy = core.transform.y;
          const barW = 60, barH = 6;
          ctx.fillStyle = '#1f2937'; ctx.fillRect(cx - barW/2, cy + 30, barW, barH);
          const pct = tdState.coreHealth / tdState.maxCoreHealth;
          ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(cx - barW/2, cy + 30, barW * pct, barH);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(`☕ ${tdState.coreHealth}/${tdState.maxCoreHealth}`, cx, cy + 44);
        }
      }

      // Canvas HUD
      const stats = gameStatsRef.current;
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.beginPath(); ctx.roundRect(10, 10, 200, 150, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 35);
      if (isTDMode) {
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px monospace';
        ctx.fillText(`Wave: ${tdState.waveIndex}/${tdWaves.length}`, 20, 100);
        ctx.fillText(`Towers: ${towers.length}`, 20, 115);
        ctx.fillText(`Enemies: ${tdState.enemiesAlive}`, 20, 130);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 135, 100, 10);
        ctx.fillStyle = tdState.coreHealth > tdState.maxCoreHealth * 0.5 ? '#22c55e' : tdState.coreHealth > tdState.maxCoreHealth * 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(20, 135, 100 * (tdState.coreHealth / tdState.maxCoreHealth), 10);
        ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.fillText(`Bean HP`, 125, 144);
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.fillText(`[T] Place tower (30 mana)`, 20, 160);
        if (tdState.waveMessageTimer > 0) {
          const alpha = Math.min(1, tdState.waveMessageTimer / 1000);
          ctx.fillStyle = `rgba(251,191,36,${alpha})`; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(tdState.waveMessage, canvas.width/2, 50); ctx.textAlign = 'left';
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 45, 100, 10);
      ctx.fillStyle = health > 50 ? '#22c55e' : health > 25 ? '#eab308' : '#ef4444';
      ctx.fillRect(20, 45, 100 * (health/100), 10);
      ctx.fillStyle = 'white'; ctx.font = '9px monospace'; ctx.fillText(`HP ${Math.round(health)}`, 125, 54);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 58, 100, 10);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(20, 58, 100 * (mana/100), 10);
      ctx.fillStyle = 'white'; ctx.fillText(`MP ${Math.round(mana)}`, 125, 67);
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${stats.fps}`, 20, 85); ctx.fillText(`Runes: ${collectedRuneIds.length}`, 20, 100);
      ctx.fillText(`Time: ${Math.floor(gameTime/1000)}s`, 20, 115); ctx.fillText(`Entities: ${stats.entities}`, 20, 130);
      const wpn = inventory.equipment.weapon;
      if (wpn) { ctx.fillStyle = '#fbbf24'; ctx.fillText(`⚔ ${wpn.name}`, 20, 145); }

      if (questHUDText) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.roundRect(10, 168, 280, 24, 6); ctx.fill();
        ctx.fillStyle = '#fbbf24'; ctx.font = '11px monospace'; ctx.fillText(`📜 ${questHUDText}`, 18, 184);
      }

      const activeSpells = spellMgr.learnedSpells.filter((s: any) => s.hotkey !== null);
      if (activeSpells.length > 0) {
        const barX = canvas.width / 2 - (activeSpells.length * 44) / 2; const barY = canvas.height - 56;
        activeSpells.forEach((spell: any, i: number) => {
          const sx = barX + i * 44;
          ctx.fillStyle = spell.currentCooldown > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)';
          ctx.beginPath(); ctx.roundRect(sx, barY, 40, 40, 6); ctx.fill();
          ctx.strokeStyle = spell.currentCooldown > 0 ? '#475569' : '#60a5fa';
          ctx.lineWidth = 2; ctx.strokeRect(sx, barY, 40, 40);
          ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(spell.icon, sx + 20, barY + 28);
          ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.fillText(`${spell.hotkey}`, sx + 20, barY + 38);
          if (spell.currentCooldown > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx, barY, 40, 40 * Math.min(1, spell.currentCooldown / spell.cooldown)); }
        });
      }

      // Minimap
      const mmSize = 120, mmX = canvas.width - mmSize - 10, mmY = 10;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 6); ctx.fill();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
      const scX = mmSize / canvas.width, scY = mmSize / canvas.height;
      entities.forEach((entity: any) => {
        ctx.fillStyle = TYPE_COLORS[entity.type] || '#8b5cf6';
        ctx.fillRect(mmX + entity.transform.x * scX - 2, mmY + entity.transform.y * scY - 2, 4, 4);
      });
    };

    const gameLoop = () => { update(); render(); animationRef.current = requestAnimationFrame(gameLoop); };
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      collisionSubscriptions.forEach((subscription) => subscription.unsubscribe());
      if (replayPlayerRef.current === replayPlayer) {
        replayPlayerRef.current = null;
      }
    };
  }, [activeScene, gameStarted, gamePaused, gameOver, victory, syncRPGState, questHUDText, handleSave, isRecording, replaySessionKey, replayAutoplay]);

  return {
    canvasRef, gameStats, gameStarted, gamePaused, gameOver, victory,
    playerScore, playerHealth, playerMana, collectedRunes, timeElapsed,
    activePanel, notifications, inventoryItems, questList,
    dialogueSpeaker, dialoguePortrait, dialogueText, dialogueChoices,
    craftingGrid, craftResult, learnedSpells, saveSlots,
    isRecording, recordingTime, hasReplay, playbackTime, playbackProgress, isPlayingBack,
    controls,
    handleStartGame, handleRestart, handleBackToEditor,
    handleUseItem, handleEquipItem, handleCraftingCell, handleLearnSpell,
    handleAssignHotkey, handleSave, handleLoad, handleDeleteSave,
    handlePauseResume, handleDialogueChoice, setActivePanel,
    handleToggleRecording, handlePlayReplay, handlePauseReplay, handleResetReplay, handleDownloadReplay,
  };
}
