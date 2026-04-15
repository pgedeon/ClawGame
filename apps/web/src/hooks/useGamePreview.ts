import { createDefaultPreviewScene } from '../utils/previewScene';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReplayRecorder,
  ReplayPlayer,
  type ReplayData,
  type InputFrame,
} from '../rpg/replay';
import {
  runPreviewRuntimeSession,
} from '../runtime/runPreviewRuntimeSession';

export type UIPanel = 'none' | 'inventory' | 'quests' | 'spellcraft' | 'saveload' | 'dialogue' | 'combat-log';

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
    { icon: '🔄', text: 'R to restart' },
  ]},
  shooter: { description: 'Shooter Controls', items: [
    { icon: '🎯', text: 'WASD to move' },
    { icon: '🔫', text: 'Mouse to aim, click to shoot' },
  ]},
  td: { description: 'Tower Defense Controls', items: [
    { icon: '🏰', text: 'Click to place towers' },
    { icon: '1️⃣', text: '1-4 to select tower type' },
    { icon: '▶', text: 'Space to start wave' },
  ]},
  racing: { description: 'Racing Controls', items: [
    { icon: '🏎', text: 'Arrow Keys / WASD to steer' },
    { icon: '🚀', text: 'Space for boost' },
  ]},
};

export interface GamePreviewReturn {
  previewRuntime: { active: { description: string; shortLabel: string } };
  runtimeHostRef: React.MutableRefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameStats: { fps: number; entities: number; memory: string };
  gameStarted: boolean;
  gamePaused: boolean;
  gameOver: boolean;
  victory: boolean;
  playerScore: number;
  highScore: number;
  playerHealth: number;
  playerMana: number;
  collectedRunes: string[];
  timeElapsed: number;
  towerDefenseOverlay: any;
  activePanel: UIPanel;
  notifications: Array<{ id: string; message: string; type: string; icon: string }>;
  inventoryItems: any[];
  questList: any[];
  dialogueSpeaker: string;
  dialoguePortrait: string;
  dialogueText: string;
  dialogueChoices: Array<{ text: string; index: number }>;
  craftingGrid: any[];
  craftResult: any;
  learnedSpells: any[];
  saveSlots: any[];
  isRecording: boolean;
  recordingTime: number;
  hasReplay: boolean;
  playbackTime: number;
  playbackDuration: number;
  playbackProgress: number;
  isPlayingBack: boolean;
  controls: { description: string; items: Array<{ icon: string; text: string }> };
  handleStartGame: () => void;
  handleRestart: () => void;
  handleBackToEditor: () => void;
  handleUseItem: (id: string) => void;
  handleEquipItem: (id: string) => void;
  handleCraftingCell: (row: number, col: number) => void;
  handleLearnSpell: () => void;
  handleAssignHotkey: (spellId: string, hotkey: number) => void;
  handleSave: (slotId: number) => void;
  handleLoad: (slotId: number) => void;
  handleDeleteSave: (slotId: number) => void;
  handlePauseResume: () => void;
  handleDialogueChoice: (index: number | undefined) => void;
  setActivePanel: (panel: UIPanel) => void;
  combatLogEntries: any[];
  handleClearCombatLog: () => void;
  handleSelectTowerType: (type: string) => void;
  handleToggleRecording: () => void;
  handlePlayReplay: () => void;
  handlePauseReplay: () => void;
  handleSeekReplay: (progress: number) => void;
  handleStepBackReplay: () => void;
  handleStepReplay: () => void;
  handleResetReplay: () => void;
  handleDownloadReplay: () => void;
  minimapData: { playerX: number; playerY: number; entities: Array<{ id: string; type: string; x: number; y: number; color: string; active: boolean }> };
}

export function useGamePreview(
  projectId: string | undefined,
  projectScene: any,
  projectGenre: string,
): GamePreviewReturn {
  const runtimeHostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef({ fps: 0, entities: 0, memory: '' });
  const highScoreRef = useRef(0);
  const inventoryRef = useRef<any>(null);
  const questMgrRef = useRef<any>(null);
  const dialogueMgrRef = useRef<any>(null);
  const spellMgrRef = useRef<any>(null);
  const combatLogRef = useRef<any[]>([]);
  const replayRecorderRef = useRef<ReplayRecorder | null>(null);
  const replayPlayerRef = useRef<ReplayPlayer | null>(null);
  const replayDataRef = useRef<ReplayData | null>(null);
  const pendingReplayStepMsRef = useRef(0);
  const gameLoopState = useRef({ gameStarted: false, gamePaused: false, gameOver: false, victory: false });
  // Use projectScene if available and has entities, otherwise use default
  const activeScene = (projectScene && projectScene.entities && projectScene.entities.length > 0)
    ? projectScene
    : createDefaultPreviewScene();
  // Legacy canvas session expects a ref, phaser expects plain object
  const activeSceneRef = useRef<any>(null);
  activeSceneRef.current = activeScene;

  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [collectedRunes, setCollectedRunes] = useState<string[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStats, setGameStats] = useState({ fps: 0, entities: 0, memory: '' });
  const [highScore, setHighScore] = useState(0);
  const [activePanel, setActivePanel] = useState<UIPanel>('none');
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string; icon: string }>>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [questList, setQuestList] = useState<any[]>([]);
  const [dialogueSpeaker, setDialogueSpeaker] = useState('');
  const [dialoguePortrait, setDialoguePortrait] = useState('');
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueChoices, setDialogueChoices] = useState<Array<{ text: string; index: number }>>([]);
  const [craftingGrid, setCraftingGrid] = useState<any[]>([]);
  const [craftResult, setCraftResult] = useState<any>(null);
  const [learnedSpells, setLearnedSpells] = useState<any[]>([]);
  const [saveSlots, setSaveSlots] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasReplay, setHasReplay] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [towerDefenseOverlay, setTowerDefenseOverlay] = useState<any>(null);
  const [combatLogEntries, setCombatLogEntries] = useState<any[]>([]);
  const [minimapData, setMinimapData] = useState({ playerX: 0, playerY: 0, entities: [] as Array<{ id: string; type: string; x: number; y: number; color: string; active: boolean }> });

  const runtimeKind = localStorage.getItem('clawgame-preview-runtime') || 'phaser4';
  const previewRuntime = { active: { description: `${runtimeKind} runtime`, shortLabel: runtimeKind } };

  const syncRPGState = useCallback(() => {
    const inv = inventoryRef.current;
    if (inv) setInventoryItems([...inv.items || []]);
    const qm = questMgrRef.current;
    if (qm) setQuestList([...qm.quests || []]);
    const dm = dialogueMgrRef.current;
    if (dm) {
      setDialogueSpeaker(dm.currentSpeaker || '');
      setDialoguePortrait(dm.currentPortrait || '');
      setDialogueText(dm.currentText || '');
      setDialogueChoices(dm.currentChoices || []);
    }
    const sm = spellMgrRef.current;
    if (sm) setLearnedSpells([...sm.learned || []]);
    setCombatLogEntries([...combatLogRef.current]);
  }, []);

  const handleStartGame = useCallback(() => {
    setGameStarted(true); setGameOver(false); setVictory(false);
    gameLoopState.current.gameStarted = true;
  }, []);
  const handleRestart = useCallback(() => {
    setGameStarted(false); setGameOver(false); setVictory(false);
    setPlayerScore(0); setPlayerHealth(100); setPlayerMana(100);
    setTimeElapsed(0); setCollectedRunes([]);
    gameLoopState.current = { gameStarted: false, gamePaused: false, gameOver: false, victory: false };
  }, []);
  const handleBackToEditor = useCallback(() => { window.history.back(); }, []);
  const handlePauseResume = useCallback(() => setGamePaused(p => !p), []);
  const handleUseItem = useCallback((_id: string) => {}, []);
  const handleEquipItem = useCallback((_id: string) => {}, []);
  const handleCraftingCell = useCallback((_row: number, _col: number) => {}, []);
  const handleLearnSpell = useCallback(() => {}, []);
  const handleAssignHotkey = useCallback((_spellId: string, _hotkey: number) => {}, []);
  const handleSave = useCallback((_slotId: number) => {}, []);
  const handleLoad = useCallback((_slotId: number) => {}, []);
  const handleDeleteSave = useCallback((_slotId: number) => {}, []);
  const handleDialogueChoice = useCallback((_index: number | undefined) => {}, []);
  const handleSelectTowerType = useCallback((_type: string) => {}, []);
  const handleClearCombatLog = useCallback(() => { combatLogRef.current = []; setCombatLogEntries([]); }, []);
  const handleToggleRecording = useCallback(() => setIsRecording(r => !r), []);
  const handlePlayReplay = useCallback(() => { setIsPlayingBack(true); setHasReplay(true); }, []);
  const handlePauseReplay = useCallback(() => setIsPlayingBack(false), []);
  const handleSeekReplay = useCallback((progress: number) => setPlaybackProgress(progress), []);
  const handleStepBackReplay = useCallback(() => {}, []);
  const handleStepReplay = useCallback(() => {}, []);
  const handleResetReplay = useCallback(() => { setIsPlayingBack(false); setPlaybackProgress(0); }, []);
  const handleDownloadReplay = useCallback(() => {}, []);

  useEffect(() => {
    if (!projectId || !projectScene) return;
    const cleanup = runPreviewRuntimeSession(runtimeKind, {
      canvasRef, animationRef, gameStatsRef, highScoreRef, gameLoopState,
      activeScene: activeSceneRef, projectGenre, gameStarted, gamePaused, gameOver, victory,
      setGameStats, setPlayerScore, setPlayerHealth, setPlayerMana,
      setCollectedRunes, setTimeElapsed,
      setActivePanel: (p: any) => setActivePanel(p as UIPanel),
      setTowerDefenseOverlayState: setTowerDefenseOverlay,
      inventoryRef, questMgrRef, dialogueMgrRef, spellMgrRef, combatLogRef,
      replayRecorderRef, replayPlayerRef, replayDataRef, pendingReplayStepMsRef,
      syncRPGState, handleSave, runtimeHostRef,
      setMinimapData,
    });
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, [projectId, projectScene]);

  const controls = GENRE_CONTROLS[projectGenre] || GENRE_CONTROLS.platformer;

  return {
    previewRuntime, runtimeHostRef, canvasRef, gameStats,
    gameStarted, gamePaused, gameOver, victory,
    playerScore, highScore, playerHealth, playerMana, collectedRunes, timeElapsed,
    towerDefenseOverlay,
    activePanel, notifications, inventoryItems, questList,
    dialogueSpeaker, dialoguePortrait, dialogueText, dialogueChoices,
    craftingGrid, craftResult, learnedSpells, saveSlots,
    isRecording, recordingTime, hasReplay, playbackTime, playbackDuration, playbackProgress, isPlayingBack,
    controls,
    handleStartGame, handleRestart, handleBackToEditor,
    handleUseItem, handleEquipItem, handleCraftingCell, handleLearnSpell,
    handleAssignHotkey, handleSave, handleLoad, handleDeleteSave,
    handlePauseResume, handleDialogueChoice, setActivePanel,
    combatLogEntries, handleClearCombatLog,
    handleSelectTowerType,
    handleToggleRecording, handlePlayReplay, handlePauseReplay, handleSeekReplay,
    handleStepBackReplay, handleStepReplay, handleResetReplay, handleDownloadReplay,
    minimapData,
  };
}

export { useGamePreview as useGamePreviewHook };
