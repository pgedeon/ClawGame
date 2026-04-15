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
  InputSystem,
  MovementSystem,
  PhysicsSystem,
  ProjectileSystem,
} from '@clawgame/engine';
import {
  GameLoopCoordinator,
  DamageSystem,
  PreviewHUD,
  type HUDState,
  type MinimapEntity,
  type HUDTowerDefenseStats,
} from '../engine-stubs';
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
  type TowerDefenseOverlayState,
  type TowerType,
} from '../utils/previewTowerDefense';
import {
  restorePreviewReplayState,
} from '../utils/previewReplayState';

// ─── Legacy Canvas Runtime Session ───
// Maintains the existing canvas-based preview loop while integrating with engine systems

export type LegacyCanvasPreviewSessionOptions = {
  canvasRef: RefObject<HTMLCanvasElement>;
  animationRef: MutableRefObject<number | null>;
  gameStatsRef: MutableRefObject<{ fps: number; entities: number; memory: string }>;
  highScoreRef: MutableRefObject<number>;
  gameLoopState: MutableRefObject<{
    gameStarted: boolean;
    gamePaused: boolean;
    gameOver: boolean;
    victory: boolean;
  }>;
  activeScene: MutableRefObject<any>;
  projectGenre: string;
  gameStarted: boolean;
  gamePaused: boolean;
  gameOver: boolean;
  victory: boolean;
  setGameStats: Dispatch<SetStateAction<{ fps: number; entities: number; memory: string }>>;
  setPlayerScore: Dispatch<SetStateAction<number>>;
  setPlayerHealth: Dispatch<SetStateAction<number>>;
  setPlayerMana: Dispatch<SetStateAction<number>>;
  setCollectedRunes: Dispatch<SetStateAction<string[]>>;
  setTimeElapsed: Dispatch<SetStateAction<number>>;
  setActivePanel: Dispatch<SetStateAction<string | null>>;
  setTowerDefenseOverlayState: Dispatch<SetStateAction<TowerDefenseOverlayState>>;
  inventoryRef: MutableRefObject<InventoryManager | null>;
  questMgrRef: MutableRefObject<QuestManager | null>;
  dialogueMgrRef: MutableRefObject<DialogueManager | null>;
  spellMgrRef: MutableRefObject<SpellCraftingManager | null>;
  combatLogRef?: MutableRefObject<any>;
  replayRecorderRef: MutableRefObject<ReplayRecorder | null>;
  replayPlayerRef: MutableRefObject<ReplayPlayer | null>;
  replayDataRef: MutableRefObject<ReplayData | null>;
  pendingReplayStepMsRef: MutableRefObject<number>;
  syncRPGState: () => void;
  handleSave: (slotId: number) => void;
  runtimeHostRef?: MutableRefObject<HTMLDivElement | null>;
  setMinimapData?: Dispatch<SetStateAction<{ playerX: number; playerY: number; entities: any[] }>>;
};

export function runLegacyCanvasPreviewSession(options: LegacyCanvasPreviewSessionOptions): (() => void) | void {
  const {
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
    setGameStats,
    setPlayerScore,
    setPlayerHealth,
    setPlayerMana,
    setCollectedRunes,
    setTimeElapsed,
    setActivePanel,
    setTowerDefenseOverlayState,
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
    setMinimapData,
  } = options;

  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animationId: number | null = null;
  let lastTime = 0;
  let frameCount = 0;
  let frameDeltaTime = 16;
  let previousKeys = {} as Record<string, boolean>;
  let pendingCanvasClick: { x: number; y: number } | null = null;
  let localInvincibleTimer = 0;
  let spellEffect: { x: number; y: number; startTime: number } | null = null;

  // ─── State bootstrapping ───
  const coordinator = new GameLoopCoordinator({});

  // Create replay player if we have replay data
  const replaySessionKey = 1; // Default, gets updated from useGamePreview
  const replayStartProgress = 0; // Default, gets updated from useGamePreview

  // Create replay player if we have replay data
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
  const inputSystem = new InputSystem();
  const aiSystem = new AISystem();
  const movementSystem = new MovementSystem({ width: canvas.width, height: canvas.height });
  const physicsSystem = new PhysicsSystem({ width: canvas.width, height: canvas.height });
  const projectileSystem = new ProjectileSystem({ width: canvas.width, height: canvas.height });
  projectileSystem.attach(collisionBus);

  const damageSystem = new DamageSystem();
  damageSystem.attach(collisionBus);

  // ─── Preview HUD Renderer (M14) ───
  const previewHUD = new PreviewHUD(ctx, { width: canvas.width, height: canvas.height });

  // Initialize scene with engine systems
  const scene = createPreviewRuntimeScene(activeScene.current);
  
  // Initialize preview collision scene
  const collisionScene = createPreviewCollisionScene(activeScene.current);
  const entities = new Map<string, any>();
  const projectiles: any[] = [];

  // Apply initial scene state
  applyPreviewRuntimeScene(scene, entities);

  // Initialize RPG managers
  // inventoryRef.current?.start?.();  // no start method
  // questMgrRef.current?.start?.();  // no start method
  // dialogueMgrRef.current?.start?.();  // no start method
  // spellMgrRef.current?.start?.();  // no start method

  // ─── Input handling ───
  const handleCanvasClick = (event: MouseEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pendingCanvasClick = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleCanvasTouch = (event: TouchEvent) => {
    event.preventDefault();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    pendingCanvasClick = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const handleCanvasTouchStart = (event: TouchEvent) => {
    event.preventDefault();
    handleCanvasTouch(event);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const currentPanel = document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none';
      if (currentPanel !== 'none' && currentPanel !== 'dialogue') {
        setActivePanel('none');
      } else if (currentPanel === 'none' && gameStarted && !gameOver && !victory) {
        setActivePanel('saveload');
      }
    }
  };

  // Set up event listeners
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('touchmove', handleCanvasTouch, { passive: false });
  canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
  window.addEventListener('keyup', handleKeyUp);

  const syncReplayPlaybackState = (activeReplayPlayer: ReplayPlayer | null) => {
    // This would need access to setPlaybackTime, setPlaybackProgress, setIsPlayingBack
    // For now, we'll just update the replay player reference
  };

  const syncSimulationState = () => {
    const state = coordinator.getState();
    setPlayerScore(state.score);
    setPlayerHealth(state.health);
    setPlayerMana(state.mana);
    setTimeElapsed(Math.floor(state.timeElapsed / 1000));
  };

  const bootstrapReplayState = () => {
    if (replayPlayer && replayDataRef.current) {
      const snapshot = replayPlayer.getSnapshotBeforeOrAt(0);
      if (snapshot) {
        restorePreviewReplayState(snapshot, { entities, projectiles: [], towers: [], tdState: null as any, collectedRuneIds: [], defeatedEnemies: [] });
      }
      syncSimulationState();
    }
  };

  const createKeyState = (keys: string[]): Record<string, boolean> => {
    const keyState: Record<string, boolean> = {};
    keys.forEach(key => {
      keyState[key] = true;
    });
    return keyState;
  };

  const isKeyJustPressed = (currentKeys: Record<string, boolean>, previousKeys: Record<string, boolean>, key: string) => {
    return currentKeys[key] && !previousKeys[key];
  };

  const PANEL_KEYS = ['saveload', 'inventory', 'spells', 'quests', 'dialogue'];

  const runSimulationFrame = ({
    frameDeltaTime,
    activeKeys,
    activeReplayPlayer = null,
    allowPanelShortcuts = true,
    clickPosition = undefined,
    recordReplayFrame = false,
    syncUi = true,
  }: {
    frameDeltaTime: number;
    activeKeys: Record<string, boolean>;
    activeReplayPlayer?: ReplayPlayer | null;
    allowPanelShortcuts?: boolean;
    clickPosition?: { x: number; y: number };
    recordReplayFrame?: boolean;
    syncUi?: boolean;
  }) => {
    const panelOpen = allowPanelShortcuts
      && PANEL_KEYS.includes(document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none');
    const wasJustPressed = (key: string) => isKeyJustPressed(activeKeys, previousKeys, key);

    // Use InputSystem for replay integration - directly set input state from replay
    if (activeReplayPlayer) {
      // For replay-driven input, directly set the engine input state
      const replayInputFrame = activeReplayPlayer.getInputsAt(activeReplayPlayer.currentTimeMs);
      if (replayInputFrame) {
        // Convert replay input frame to engine input state
        const engineInputState = toEngineInputState(Array.isArray(replayInputFrame.keys) ? Object.fromEntries(replayInputFrame.keys.map((k: string) => [k, true])) : replayInputFrame.keys as Record<string, boolean>);
        inputSystem.setState(engineInputState);
      }
    } else {
      // For live input, let the InputSystem bind to the canvas and update naturally
      inputSystem.bind(canvas);
      const engineInputState = toEngineInputState(Object.fromEntries(Object.keys(activeKeys).filter(key => activeKeys[key]).map(k => [k, true])));
      inputSystem.setState(engineInputState);
    }

    // Advance coordinator time (converts ms → seconds for engine)
    coordinator.update(frameDeltaTime / 1000);
    const simulationTime = coordinator.getState().timeElapsed * 1000;
    if (syncUi) {
      setTimeElapsed(Math.floor(simulationTime / 1000));
    }

    if (localInvincibleTimer > 0) localInvincibleTimer -= frameDeltaTime;

    // Mana regen (engine coordinator tracks mana, but regen rate is game-specific)
    coordinator.regenerateMana(frameDeltaTime * 0.01);
    // spell cooldowns - no method

    if (allowPanelShortcuts && wasJustPressed('escape')) {
      setActivePanel((prev: any) => {
        const currentPanel = document.querySelector('[data-rpg-panel]')?.getAttribute('data-rpg-panel') || 'none';
        if (currentPanel !== 'none' && currentPanel !== 'dialogue') return 'none';
        if (currentPanel === 'none' && gameStarted && !gameOver && !victory) {
          setActivePanel('saveload');
        }
        return prev;
      });
    }

    // Update RPG managers
    // inventory advance - no method
    // quest advance - no method
    // dialogue advance - no method

    // ─── Engine system updates ───
    // Update scene with all systems - input is now handled by InputSystem
    if (scene) {
      physicsSystem.update(scene, frameDeltaTime / 1000);
      movementSystem.update(scene, inputSystem.getState(), frameDeltaTime / 1000);
      aiSystem.update(scene, frameDeltaTime / 1000);
      projectileSystem.update(scene, frameDeltaTime / 1000);
      collisionSystem.update(scene);
    }

    // Store keys for next frame's "just pressed" detection
    previousKeys = { ...activeKeys };
  };

  // Read state from coordinator for rendering
  const getScore = () => coordinator.getState().score;
  const getHealth = () => coordinator.getState().health;
  const getMana = () => coordinator.getState().mana;
  const getGameTime = () => coordinator.getState().timeElapsed * 1000;

  const render = () => {
    const score = getScore();
    const health = getHealth();
    const mana = getMana();
    const gameTime = getGameTime();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
    ctx.setLineDash([5, 5]);

    // Render entities
    for (const entity of entities.values()) {
      if (entity.has?.RenderComponent) {
        const render = entity.RenderComponent;
        const transform = entity.transform;
        
        if (render.sprite?.image) {
          ctx.drawImage(
            render.sprite.image,
            transform.x - render.sprite.width / 2,
            transform.y - render.sprite.height / 2,
            render.sprite.width,
            render.sprite.height
          );
        } else {
          ctx.fillStyle = render.color || '#ffffff';
          ctx.fillRect(
            transform.x - transform.width / 2,
            transform.y - transform.height / 2,
            transform.width,
            transform.height
          );
        }
      }
    }

    // Render projectiles
    for (const projectile of projectiles) {
      if (projectile.has?.RenderComponent) {
        const render = projectile.RenderComponent;
        const transform = projectile.transform;
        
        if (render.sprite?.image) {
          ctx.drawImage(
            render.sprite.image,
            transform.x - render.sprite.width / 2,
            transform.y - render.sprite.height / 2,
            render.sprite.width,
            render.sprite.height
          );
        } else {
          ctx.fillStyle = render.color || '#ffff00';
          ctx.beginPath();
          ctx.arc(transform.x, transform.y, render.width / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Render spell effects
    if (spellEffect) {
      const now = performance.now();
      const age = now - spellEffect.startTime;
      if (age > 500) {
        spellEffect = null;
      } else {
        const alpha = 1 - age / 500;
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(spellEffect.x, spellEffect.y, 20 * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render HUD elements
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Health: ${health}`, 10, 50);
    ctx.fillText(`Mana: ${mana}`, 10, 70);
    ctx.fillText(`Time: ${Math.floor(gameTime / 1000)}s`, 10, 110);

    // Render game over or victory screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
      ctx.font = '24px monospace';
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
      ctx.textAlign = 'left';
    } else if (victory) {
      ctx.fillStyle = 'rgba(0, 128, 0, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY', canvas.width / 2, canvas.height / 2);
      ctx.font = '24px monospace';
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
      ctx.textAlign = 'left';
    }
  };

  const gameLoop = (currentTime: number) => {
    frameCount++;
    
    // Calculate frame delta time
    if (lastTime === 0) {
      lastTime = currentTime;
    }
    frameDeltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Determine if we should run simulation and render
    const shouldRun = gameStarted && !gamePaused && !gameOver && !victory;
    
    if (shouldRun) {
      // Check if we're in replay mode
      const activeReplayPlayer = replayPlayerRef.current;
      
      if (activeReplayPlayer) {
        // For replay mode, advance replay time and get input state
        const replayInput = activeReplayPlayer.tick(frameDeltaTime);
        
        if (replayInput) {
          // Create key state from replay input
          const replayKeyState = createKeyState(replayInput.keys);
          
          // Run simulation frame with replay input
          runSimulationFrame({
            frameDeltaTime,
            activeKeys: replayKeyState,
            activeReplayPlayer,
            allowPanelShortcuts: false, // Disable panel shortcuts during replay
            clickPosition: replayInput.click,
            recordReplayFrame: false,
            syncUi: true,
          });
        } else {
          // Replay has ended
          activeReplayPlayer.pause();
          // You might want to add logic here to handle replay completion
        }
      } else {
        // For live gameplay, get current input state from canvas
        const engineInputState = inputSystem.getState();
        const keysArray = Object.keys(engineInputState).filter((key: any) => engineInputState[key as keyof typeof engineInputState]);
        
        // Run simulation frame with live input
        runSimulationFrame({
          frameDeltaTime,
          activeKeys: createKeyState(keysArray),
          activeReplayPlayer: null,
          allowPanelShortcuts: true,
          clickPosition: pendingCanvasClick || undefined,
          recordReplayFrame: false,
          syncUi: true,
        });
        
        // Clear pending click after processing
        pendingCanvasClick = null;
      }
      
      // Render after simulation
      render();
    } else {
      // Even when not running, render the current state
      render();
    }

    // Capture minimap data (throttled by frame - React batches updates)
    if (setMinimapData) {
      let px = 0, py = 0;
      const mmEntities: Array<{ id: string; type: string; x: number; y: number; color: string; active: boolean }> = [];
      for (const [id, entity] of entities.entries()) {
        const transform = entity.transform;
        if (!transform) continue;
        const type = entity.tag === 'player' ? 'player'
          : entity.tag === 'enemy' ? 'enemy'
          : entity.tag === 'rune' || entity.tag === 'collectible' ? 'rune'
          : entity.tag === 'npc' ? 'npc'
          : 'enemy';
        if (type === 'player') { px = transform.x; py = transform.y; }
        mmEntities.push({
          id,
          type,
          x: transform.x,
          y: transform.y,
          color: type === 'enemy' ? '#ef4444' : type === 'rune' ? '#a855f7' : type === 'npc' ? '#3b82f6' : '#22c55e',
          active: entity.active !== false,
        });
      }
      setMinimapData(prev =>
        (prev.playerX === px && prev.playerY === py && prev.entities.length === mmEntities.length)
          ? prev
          : { playerX: px, playerY: py, entities: mmEntities }
      );
    }

    // Continue the loop if we should be running
    if (shouldRun || (gamePaused && replayPlayerRef.current?.isPlaying)) {
      animationId = requestAnimationFrame(gameLoop);
    }
  };

  // Bootstrap replay state if we have a replay player
  if (replayPlayer) {
    bootstrapReplayState();
  }

  // Start the game loop
  animationId = requestAnimationFrame(gameLoop);

  // Return cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    animationRef.current = null;
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.removeEventListener('touchmove', handleCanvasTouch);
    canvas.removeEventListener('touchstart', handleCanvasTouchStart);
    if (replayPlayerRef.current === replayPlayer) {
      replayPlayerRef.current = null;
    }
  };
}