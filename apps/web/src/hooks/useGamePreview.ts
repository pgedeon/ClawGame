import { createDefaultPreviewScene } from '../utils/previewScene';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReplayRecorder,
  ReplayPlayer,
  type ReplayData,
} from '../rpg/replay';
import { CombatLogManager } from '../rpg/combatlog';
import {
  runPreviewRuntimeSession,
} from '../runtime/runPreviewRuntimeSession';
import type { PhaserRuntimeError } from '../../../../packages/phaser-runtime/src';

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
  puzzle: { description: 'Puzzle Controls', items: [
    { icon: '👆', text: 'Click to interact' },
  ]},
  'tower-defense': { description: 'Tower Defense Controls', items: [
    { icon: '🏗️', text: 'Click empty slot to build tower' },
    { icon: '🏹', text: 'Towers auto-attack enemies in range' },
    { icon: '⏸️', text: 'Space to pause game' },
  ]},
};

// ─── Runtime descriptor helpers ───
const RUNTIME_DESCRIPTORS: Record<string, { label: string; shortLabel: string; description: string }> = {
  'legacy-canvas': { label: 'Canvas Runtime', shortLabel: 'Canvas', description: 'Legacy HTML5 Canvas runtime' },
  'phaser4': { label: 'Phaser 4 Runtime', shortLabel: 'Phaser 4', description: 'Phaser 4 physics-enabled runtime' },
};

function getRuntimeDescriptor(kind: string) {
  return RUNTIME_DESCRIPTORS[kind] || RUNTIME_DESCRIPTORS['legacy-canvas'];
}

function getRuntimeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Preview runtime error';
}

// ─── Main hook ───
export function useGamePreview(
  _projectId: string,
  projectScene: any,
  projectGenre: string = 'platformer',
) {
  // Core refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef({ fps: 60, entities: 0, memory: 'N/A' });
  const highScoreRef = useRef(0);
  const runtimeHostRef = useRef<any>(null);

  // Game loop state
  const gameLoopState = useRef({ gameStarted: false, gamePaused: false, gameOver: false, victory: false });

  // Derived active scene
  const activeScene = (projectScene && projectScene.entities && projectScene.entities.length > 0)
    ? projectScene
    : createDefaultPreviewScene();
  const activeSceneRef = useRef<any>(null);
  activeSceneRef.current = activeScene;

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
  const [craftResult, setCraftResult] = useState<any>(null);
  const [learnedSpells, setLearnedSpells] = useState<string[]>([]);
  const [saveSlots, setSaveSlots] = useState<any[]>([]);
  const [combatLogEntries, setCombatLogEntries] = useState<any[]>([]);

  // Tower Defense state
  const [towerDefenseOverlay, setTowerDefenseOverlay] = useState<any>(null);
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
  const [minimapData, setMinimapData] = useState<any>(null);
  const [runtimeErrors, setRuntimeErrors] = useState<PreviewRuntimeErrorNotice[]>([]);

  // Refs for manager instances
  const inventoryRef = useRef<any>(null);
  const questMgrRef = useRef<any>(null);
  const dialogueMgrRef = useRef<any>(null);
  const spellMgrRef = useRef<any>(null);
  const combatLogManagerRef = useRef<CombatLogManager | null>(null);
  const replayRecorderRef = useRef<ReplayRecorder | null>(null);
  const replayPlayerRef = useRef<ReplayPlayer | null>(null);
  const replayDataRef = useRef<ReplayData | null>(null);
  const pendingReplayStepMsRef = useRef(0);

  // Runtime kind from localStorage
  const runtimeKind = localStorage.getItem('clawgame-preview-runtime') || 'phaser4';
  const previewRuntime = {
    active: getRuntimeDescriptor(runtimeKind),
    kinds: RUNTIME_DESCRIPTORS,
    select: (kind: string) => {
      localStorage.setItem('clawgame-preview-runtime', kind);
      window.location.reload();
    },
  };

  // Controls derived from genre
  const controls = GENRE_CONTROLS[projectGenre] || GENRE_CONTROLS.platformer;

  // RPG managers
  const syncRPGStateInternal = useCallback((state: any) => {
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

  const syncRPGState = useCallback(() => {
    // Wrapper for compatibility with runtime expectations
  }, []);

  const handleSave = useCallback(() => {
    // Wrapper for compatibility with runtime expectations
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

  const handleUseItem = useCallback((_itemId: string) => {
    // Placeholder
  }, []);

  const handleEquipItem = useCallback((_itemId: string) => {
    // Placeholder
  }, []);

  const handleCraftingCell = useCallback((_row: number, _col: number) => {
    // Placeholder
  }, []);

  const handleLearnSpell = useCallback(() => {
    // Placeholder
  }, []);

  const handleAssignHotkey = useCallback((_spellId: string, _hotkey: number) => {
    // Placeholder
  }, []);

  const handlePauseResume = useCallback(() => {
    setGamePaused(p => !p);
  }, []);

  const handleDialogueChoice = useCallback((_index: number | undefined) => {
    // Placeholder
  }, []);

  const handleSelectTowerType = useCallback((towerType: string) => {
    setSelectedTowerType(towerType);
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

  const handleSeekReplay = useCallback((_progress: number) => {
    // Placeholder
  }, []);

  const handleStepBackReplay = useCallback(() => {
    // Placeholder
  }, []);

  const handleStepReplay = useCallback(() => {
    // Placeholder
  }, []);

  const handleResetReplay = useCallback(() => {
    // Placeholder
  }, []);

  const handleDownloadReplay = useCallback(() => {
    // Placeholder
  }, []);

  const handleClearCombatLog = useCallback(() => {
    if (combatLogManagerRef.current) {
      combatLogManagerRef.current.clear();
    }
  }, []);

  // Initialize preview runtime session
  useEffect(() => {
    // Check the right ref based on runtime kind
    const needsCanvas = runtimeKind === 'legacy-canvas';
    const needsHost = runtimeKind === 'phaser4';

    if (needsCanvas && !canvasRef.current) return;
    if (needsHost && !runtimeHostRef.current) return;

    let mounted = true;
    setRuntimeErrors([]);
    const cleanup = runPreviewRuntimeSession(runtimeKind, {
      canvasRef, animationRef, gameStatsRef, highScoreRef, gameLoopState,
      activeScene: activeSceneRef, projectGenre, gameStarted, gamePaused, gameOver, victory,
      setGameStats, setPlayerScore, setPlayerHealth, setPlayerMana,
      setCollectedRunes, setTimeElapsed,
      setActivePanel: (p: any) => setActivePanel(p as UIPanel),
      setTowerDefenseOverlayState: setTowerDefenseOverlay,
      inventoryRef, questMgrRef, dialogueMgrRef, spellMgrRef, combatLogRef: combatLogManagerRef,
      replayRecorderRef, replayPlayerRef, replayDataRef, pendingReplayStepMsRef,
      syncRPGState, handleSave, runtimeHostRef,
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
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [runtimeKind, projectGenre, syncRPGState, handleSave]);

  // Return all state and handlers
  return {
    canvasRef,
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
