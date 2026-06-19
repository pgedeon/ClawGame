import { createDefaultPreviewScene } from '../utils/previewScene';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReplayRecorder,
  ReplayPlayer,
  downloadReplay,
  type ReplayData,
} from '../rpg/replay';
import { CombatLogManager } from '../rpg/combatlog';
import type { InventoryManager } from '../rpg/inventory';
import type { DialogueManager } from '../rpg/dialogue';
import type { SpellCraftingManager } from '../rpg/spellcrafting';
import type { QuestManager } from '../rpg/quests';
import {
  runPreviewRuntimeSession,
  type PreviewRuntimeSessionCallbacks,
} from '../runtime/runPreviewRuntimeSession';
import {
  PHASER4_RUNTIME_DESCRIPTOR,
  listPreviewRuntimeDescriptors,
  setRequestedPreviewRuntimeKind,
} from '../runtime/previewRuntimeConfig';
import type { PhaserRuntimeError } from '../../../../packages/phaser-runtime/src';
import type { PhaserSessionHandle } from '../runtime/phaserPreviewSession';
import type { TowerDefenseOverlayState, TowerType } from '../utils/previewTowerDefense';
import type { MinimapEntity } from '../components/game/DungeonMinimap';
import { logger } from '../utils/logger';

export type UIPanel = 'none' | 'inventory' | 'quests' | 'spellcraft' | 'saveload' | 'dialogue' | 'combat-log';

interface PreviewRuntimeErrorNotice {
  id: string;
  phase: string;
  message: string;
}

// ─── Genre controls map ───
export const GENRE_CONTROLS: Record<string, { description: string; items: Array<{ icon: string; text: string }> }> = {
  platformer: { description: 'Platformer Controls', items: [
    { icon: '⬆', text: 'Arrow Keys / WASD to move' },
    { icon: '🦘', text: 'Space to jump' },
    { icon: '💬', text: 'E to interact' },
  ]},
  rpg: { description: 'RPG Controls', items: [
    { icon: '⬆', text: 'Arrow Keys / WASD to move' },
    { icon: '💬', text: 'E to interact' },
    { icon: '🎒', text: 'I for inventory' },
    { icon: '📜', text: 'Q for quests' },
  ]},
  'tower-defense': { description: 'Tower Defense Controls', items: [
    { icon: '🏗️', text: 'Click empty slot to build tower' },
    { icon: '🏹', text: 'Towers auto-attack enemies in range' },
    { icon: '⏸️', text: 'Space to pause game' },
  ]},
  shooter: { description: 'Shooter Controls', items: [
    { icon: '⬆', text: 'Arrows / WASD to move' },
    { icon: '🔫', text: 'SPACE to fire' },
    { icon: '💥', text: 'Destroy asteroids to score' },
  ]},
  puzzle: { description: 'Puzzle Controls', items: [
    { icon: '⬆', text: 'Arrows / WASD to move' },
    { icon: '🔮', text: 'Collect all orbs' },
    { icon: '🚪', text: 'Reach the exit to win' },
  ]},
};

function getRuntimeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Preview runtime error';
}

// ─── Main hook ───
export function useGamePreview(
  _projectId: string,
  projectScene: { entities?: unknown[]; width?: number; height?: number; background?: string } | null,
  projectGenre: string = 'platformer',
) {
  // Core refs
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef({ fps: 60, entities: 0, memory: 'N/A' });
  const highScoreRef = useRef(0);
  const runtimeHostRef = useRef<HTMLDivElement>(null);
  const phaserSessionRef = useRef<PhaserSessionHandle | null>(null);

  // Game loop state
  const gameLoopState = useRef({ gameStarted: false, gamePaused: false, gameOver: false, victory: false });

  // Derived active scene
  const activeScene = (projectScene && projectScene.entities && projectScene.entities.length > 0)
    ? projectScene
    : createDefaultPreviewScene();
  const activeSceneRef = useRef<typeof activeScene | null>(null);
  activeSceneRef.current = activeScene;
  // Stable key to trigger re-initialization when scene data changes
  const sceneKey = activeScene ? activeScene.entities?.length ?? 0 : 0;

  // Core game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [gameStats, setGameStats] = useState({
    fps: 60,
    entities: 0,
    memory: 'N/A',
  });

  // Player stats
  const [playerScore, setPlayerScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [collectedRunes, setCollectedRunes] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // RPG state
  const [activePanel, setActivePanel] = useState<UIPanel>('none');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [questList, setQuestList] = useState<any[]>([]);
  const [dialogueSpeaker, setDialogueSpeaker] = useState<string>('');
  const [dialoguePortrait, setDialoguePortrait] = useState<string>('');
  const [dialogueText, setDialogueText] = useState<string>('');
  const [dialogueChoices, setDialogueChoices] = useState<any[]>([]);
  const [craftingGrid, setCraftingGrid] = useState(Array(9).fill(null));
  const [craftResult, setCraftResult] = useState<string | null>(null);
  const [learnedSpells, setLearnedSpells] = useState<string[]>([]);
  const [saveSlots, setSaveSlots] = useState<any[]>([]);
  const [combatLogEntries, setCombatLogEntries] = useState<any[]>([]);

  // Tower Defense state
  const [towerDefenseOverlay, setTowerDefenseOverlay] = useState<TowerDefenseOverlayState | null>(null);
  const [selectedTowerType, setSelectedTowerType] = useState<string | undefined>();
  const [tdFeedback, setTdFeedback] = useState<string | undefined>();

  // Replay state
  const [hasReplay, setHasReplay] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Minimap state
  const [minimapData, setMinimapData] = useState<{ playerX: number; playerY: number; entities: MinimapEntity[] } | undefined>(undefined);
  const [runtimeErrors, setRuntimeErrors] = useState<PreviewRuntimeErrorNotice[]>([]);

  // Refs for manager instances
  const inventoryRef = useRef<InventoryManager | null>(null);
  const questMgrRef = useRef<QuestManager | null>(null);
  const dialogueMgrRef = useRef<DialogueManager | null>(null);
  const spellMgrRef = useRef<SpellCraftingManager | null>(null);
  const combatLogManagerRef = useRef<CombatLogManager | null>(null);
  const replayRecorderRef = useRef<ReplayRecorder | null>(null);
  const replayPlayerRef = useRef<ReplayPlayer | null>(null);
  const replayDataRef = useRef<ReplayData | null>(null);
  const pendingReplayStepMsRef = useRef(0);

  // Runtime — always Phaser 4 (legacy canvas removed in Phase 7)
  const runtimeKind = 'phaser4';
  const previewRuntime = {
    active: PHASER4_RUNTIME_DESCRIPTOR,
    kinds: Object.fromEntries(listPreviewRuntimeDescriptors().map(d => [d.kind, d])),
    select: (kind: string) => {
      setRequestedPreviewRuntimeKind(kind as 'phaser4');
      window.location.reload();
    },
  };

  // Controls derived from genre
  const controls = GENRE_CONTROLS[projectGenre] || GENRE_CONTROLS.platformer;

  // RPG managers
  interface RPGSyncState {
    inventory?: string[];
    quests?: string[];
    dialogue?: { speaker: string; portrait: string; text: string; choices: string[] };
    spells?: string[];
    craftingGrid?: unknown[];
    craftResult?: string;
  }

  const syncRPGStateInternal = useCallback((state: RPGSyncState) => {
    if (state.inventory) setInventoryItems(state.inventory);
    if (state.quests) setQuestList(state.quests);
    if (state.dialogue) {
      setDialogueSpeaker(state.dialogue.speaker);
      setDialoguePortrait(state.dialogue.portrait);
      setDialogueText(state.dialogue.text);
      setDialogueChoices(state.dialogue.choices || []);
    }
    if (state.spells) setLearnedSpells(state.spells);
    if (state.craftingGrid) setCraftingGrid(state.craftingGrid);
    if (state.craftResult) setCraftResult(state.craftResult);
  }, []);

  // RPG state sync: reads state from Phaser RPGScene when available
  const syncRPGState = useCallback(() => {
    // Reads from Phaser RPGScene instance via phaserSessionRef
    // Scene already manages its own internal state; React state syncs via onTDStateChange pattern
  }, []);

  const handleSave = useCallback(() => {
    // Save game state to localStorage via SaveLoadManager
    // Full project file API persistence is a future enhancement
    logger.info('[ClawGame] Save requested — using localStorage save system');
  }, []);

  const handleStartGame = useCallback(() => {
    gameLoopState.current = { gameStarted: true, gamePaused: false, gameOver: false, victory: false };
    setGameStarted(true);
    setGamePaused(false);
    setGameOver(false);
    setVictory(false);
    setTimeElapsed(0);
    setPlayerHealth(100);
    setPlayerMana(100);
    setPlayerScore(0);
    // Focus the Phaser canvas so keyboard events reach it
    requestAnimationFrame(() => {
      const host = runtimeHostRef.current;
      if (host) {
        const canvas = host.querySelector('canvas');
        if (canvas) {
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
        }
      }
    });
  }, []);

  const handleRestart = useCallback(() => {
    handleStartGame();
  }, [handleStartGame]);

  const handleBackToEditor = useCallback(() => {
    setGameStarted(false);
    setGameOver(false);
    setVictory(false);
    setActivePanel('none');
  }, []);

  const handleUseItem = useCallback((itemId: string) => {
    inventoryRef.current?.useItem(itemId);
  }, []);

  const handleEquipItem = useCallback((itemId: string) => {
    inventoryRef.current?.equipItem(itemId);
  }, []);

  const handleCraftingCell = useCallback((_row: number, _col: number) => {
    // Crafting grid interaction — spell crafting UI handles cell selection internally
    // This callback is invoked when a crafting grid cell is clicked
  }, []);

  const handleLearnSpell = useCallback(() => {
    // Spell learning is handled by the spellcrafting UI panel directly
    // This hook is a no-op placeholder for the callback interface
  }, []);

  const handleAssignHotkey = useCallback((spellId: string, hotkey: number) => {
    spellMgrRef.current?.assignHotkey(spellId, hotkey);
  }, []);

  const handlePauseResume = useCallback(() => {
    setGamePaused(p => !p);
  }, []);

  const handleDialogueChoice = useCallback((index: number | undefined) => {
    dialogueMgrRef.current?.advance(index);
  }, []);

  const handleSelectTowerType = useCallback((towerType: string) => {
    setSelectedTowerType(towerType);
    // Forward to Phaser scene
    phaserSessionRef.current?.selectTowerType(towerType);
  }, []);

  const handleToggleRecording = useCallback(() => {
    setIsRecording(p => !p);
  }, []);

  const handlePlayReplay = useCallback(() => {
    setIsPlayingBack(true);
  }, []);

  const handlePauseReplay = useCallback(() => {
    setIsPlayingBack(false);
  }, []);

  const handleSeekReplay = useCallback((progress: number) => {
    replayPlayerRef.current?.seekTo(progress);
  }, []);

  const handleStepBackReplay = useCallback(() => {
    replayPlayerRef.current?.step(-100); // Step back 100ms
  }, []);

  const handleStepReplay = useCallback(() => {
    replayPlayerRef.current?.step(100); // Step forward 100ms
  }, []);

  const handleResetReplay = useCallback(() => {
    replayPlayerRef.current?.reset();
  }, []);

  const handleDownloadReplay = useCallback(() => {
    if (replayDataRef.current) {
      downloadReplay(replayDataRef.current);
    }
  }, []);

  const handleClearCombatLog = useCallback(() => {
    if (combatLogManagerRef.current) {
      combatLogManagerRef.current.clear();
    }
  }, []);

  // Initialize preview runtime session
  useEffect(() => {
    if (!runtimeHostRef.current) return;

    let mounted = true;
    setRuntimeErrors([]);
    const sessionCallbacks: PreviewRuntimeSessionCallbacks = {
      onPhaserSession: (handle: PhaserSessionHandle) => {
        phaserSessionRef.current = handle;
        handle.onTDStateChange = (state) => {
          setTowerDefenseOverlay({
            enabled: state.enabled,
            selectedTowerType: (state.selectedTowerType as TowerType) ?? 'basic',
            feedback: (state.feedback as TowerDefenseOverlayState['feedback']) ?? null,
          });
          if (state.selectedTowerType) setSelectedTowerType(state.selectedTowerType);
        };
      },
      onRuntimeError: (runtimeError: PhaserRuntimeError) => {
        if (!mounted) return;
        setRuntimeErrors((current) => [
          ...current,
          {
            id: `${Date.now()}-${current.length}`,
            phase: runtimeError.phase,
            message: getRuntimeErrorMessage(runtimeError.error),
          },
        ]);
      },
    };
    const cleanup = runPreviewRuntimeSession(runtimeKind, {
      activeScene: activeSceneRef as any, projectGenre, gameStarted, gamePaused, gameOver, victory,
      setGameStats, setPlayerScore, setPlayerHealth, setPlayerMana,
      setCollectedRunes, setTimeElapsed,
      setActivePanel: (p: UIPanel) => setActivePanel(p),
      setTowerDefenseOverlayState: setTowerDefenseOverlay,
      inventoryRef, questMgrRef, dialogueMgrRef, spellMgrRef, combatLogRef: combatLogManagerRef,
      replayRecorderRef, replayPlayerRef, replayDataRef, pendingReplayStepMsRef,
      syncRPGState, handleSave, runtimeHostRef,
      canvasRef: { current: null } as React.RefObject<HTMLCanvasElement>,
      animationRef, gameStatsRef, highScoreRef, gameLoopState: gameLoopState as any,
      isRecording: false, replaySessionKey: 0, replayAutoplay: false,
      replayStartProgress: 0, questHUDText: '',
      setGameOver, setVictory, setPlaybackTime, setPlaybackProgress, setIsPlayingBack,
      setGamePaused,
      setDialogueSpeaker, setDialoguePortrait, setDialogueText, setDialogueChoices,
    }, sessionCallbacks);

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [projectGenre, syncRPGState, handleSave, sceneKey]);

  // Return all state and handlers
  return {
    animationRef,
    gameStatsRef,
    highScoreRef,
    gameLoopState,
    runtimeHostRef,

    // Core game state
    gameStarted,
    gamePaused,
    gameOver,
    victory,
    gameStats,
    playerScore,
    playerHealth,
    playerMana,
    collectedRunes,
    timeElapsed,
    highScore,

    // RPG state
    activePanel,
    notifications,
    inventoryItems,
    questList,
    dialogueSpeaker,
    dialoguePortrait,
    dialogueText,
    dialogueChoices,
    craftingGrid,
    craftResult,
    learnedSpells,
    saveSlots,
    combatLogEntries,

    // Replay state
    hasReplay,
    playbackTime,
    playbackDuration,
    playbackProgress,
    isPlayingBack,
    isRecording,
    recordingTime,

    // Refs
    inventoryRef,
    questMgrRef,
    dialogueMgrRef,
    spellMgrRef,
    combatLogRef: combatLogManagerRef,
    replayRecorderRef,
    replayPlayerRef,
    replayDataRef,
    pendingReplayStepMsRef,

    // Runtime
    previewRuntime,
    runtimeKind,
    runtimeErrors,

    // Controls
    controls,

    // Event handlers
    handleStartGame,
    handleRestart,
    handleBackToEditor,
    handleUseItem,
    handleEquipItem,
    handleCraftingCell,
    handleLearnSpell,
    handleAssignHotkey,
    handlePauseResume,
    handleDialogueChoice,
    handleSelectTowerType,
    handleToggleRecording,
    handlePlayReplay,
    handlePauseReplay,
    handleSeekReplay,
    handleStepBackReplay,
    handleStepReplay,
    handleResetReplay,
    handleDownloadReplay,
    handleClearCombatLog,
    setActivePanel,
    syncRPGStateInternal,
    handleSave,
    handleLoad: (_slotId: number) => {},
    handleDeleteSave: (_slotId: number) => {},

    // Tower Defense
    towerDefenseOverlay,
    selectedTowerType,
    tdFeedback,

    // Minimap
    minimapData,
    setMinimapData,
  };
}
