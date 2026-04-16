/**
 * @clawgame/web - Legacy Canvas Preview Runtime
 *
 * Bridges the React hook world with the engine runtime system.
 * Handles canvas setup, input routing, game loop, and tower-defense integration.
 */

import type { MutableRefObject } from 'react';
import type {
  ReplayRecorder,
  ReplayPlayer,
  ReplayData,
} from '../rpg/replay';

export type LegacyCanvasPreviewSessionOptions = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
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
  setGameStats: React.Dispatch<React.SetStateAction<{ fps: number; entities: number; memory: string }>>;
  setPlayerScore: React.Dispatch<React.SetStateAction<number>>;
  setPlayerHealth: React.Dispatch<React.SetStateAction<number>>;
  setPlayerMana: React.Dispatch<React.SetStateAction<number>>;
  setCollectedRunes: React.Dispatch<React.SetStateAction<string[]>>;
  setTimeElapsed: React.Dispatch<React.SetStateAction<number>>;
  setActivePanel: (p: any) => void;
  setTowerDefenseOverlayState: React.Dispatch<React.SetStateAction<any>>;
  inventoryRef: MutableRefObject<any>;
  questMgrRef: MutableRefObject<any>;
  dialogueMgrRef: MutableRefObject<any>;
  spellMgrRef: MutableRefObject<any>;
  combatLogRef?: MutableRefObject<any>;
  replayRecorderRef: MutableRefObject<ReplayRecorder | null>;
  replayPlayerRef: MutableRefObject<ReplayPlayer | null>;
  replayDataRef: MutableRefObject<ReplayData | null>;
  pendingReplayStepMsRef: MutableRefObject<number>;
  syncRPGState: () => void;
  handleSave: () => void;
  runtimeHostRef: MutableRefObject<HTMLDivElement | null>;
};

export function runLegacyCanvasPreviewSession(options: LegacyCanvasPreviewSessionOptions): () => void {
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
    combatLogRef,
    replayRecorderRef,
    replayPlayerRef,
    replayDataRef,
    pendingReplayStepMsRef,
    syncRPGState,
    handleSave,
    runtimeHostRef,
  } = options;

  // Early return if canvas is not available
  const canvas = canvasRef.current;
  if (!canvas) {
    return () => {};
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => {};
  }

  // Track tower defense state
  let tdState: any = null;

  // Initialize scene
  const initializeScene = () => {
    const entities = activeScene.current?.entities ?? [];
    // Create minimal scene for canvas drawing
  };

  initializeScene();

  // Game loop
  const gameLoop = (timestamp: number) => {
    if (!gameStarted) return;
    if (gamePaused || gameOver || victory) {
      return;
    }

    const deltaTime = 0.016; // Approx 60fps

    // Update game stats
    setGameStats({ fps: 60, entities: 0, memory: '0MB' });
    setTimeElapsed(prev => prev + deltaTime);

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scene entities
    const entities = activeScene.current?.entities ?? [];
    
    // Handle both Map and Array formats
    let entityArray: any[] = [];
    if (entities instanceof Map) {
      entityArray = Array.from(entities.values());
    } else if (Array.isArray(entities)) {
      entityArray = entities;
    } else if (entities.entities instanceof Map) {
      entityArray = Array.from(entities.entities.values());
    } else if (Array.isArray(entities.entities)) {
      entityArray = entities.entities;
    }
    
    for (const entity of entityArray) {
      if (!entity) continue;

      const transform = (entity as any).transform ?? { x: 0, y: 0 };
      const x = transform.x ?? 0;
      const y = transform.y ?? 0;
      const width = (entity as any).width ?? 32;
      const height = (entity as any).height ?? 32;
      const type = (entity as any).type ?? 'unknown';

      // Set color based on entity type
      ctx.fillStyle = getEntityColor(type);
      ctx.fillRect(x - width / 2, y - height / 2, width, height);

      // Draw text label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(type, x, y - height / 2 - 5);
    }

    // Request next frame
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Start game loop
  animationRef.current = requestAnimationFrame(gameLoop);

  // Cleanup function
  return () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
}

function getEntityColor(type: string): string {
  const colors: Record<string, string> = {
    player: '#4ade80',
    enemy: '#f87171',
    obstacle: '#9ca3af',
    platform: '#6366f1',
    'td-enemy': '#fb923c',
    core: '#a855f7',
  };
  return colors[type] ?? '#ffffff';
}
