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
import { ReplayRecorder, ReplayPlayer, downloadReplay, type ReplayData } from '../rpg/replay';
import { resolvePreviewRuntimeSelection, runPreviewRuntimeSession } from '../runtime';

/* ─── Types ─── */
export interface GameStats { fps: number; entities: number; memory: string; }

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
  const runtimeHostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const highScoreRef = useRef<number>(0);
  const gameStatsRef = useRef<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const gameLoopState = useRef<any>(null);
  const [previewRuntime] = useState(() => resolvePreviewRuntimeSelection());

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
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('clawgame:highScore') || '0', 10); } catch { return 0; }
  });
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
  const pendingReplayStepMsRef = useRef(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasReplay, setHasReplay] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [replaySessionKey, setReplaySessionKey] = useState(0);
  const [replayAutoplay, setReplayAutoplay] = useState(false);
  const [replayStartProgress, setReplayStartProgress] = useState(0);

  const genreKey = projectGenre === 'tower-defense' ? 'strategy' : projectGenre;
  const controls = GENRE_CONTROLS[genreKey] || GENRE_CONTROLS.default;

  useEffect(() => {
    replayRecorderRef.current = projectId ? new ReplayRecorder(projectId) : null;
    replayPlayerRef.current = null;
    replayDataRef.current = null;
    pendingReplayStepMsRef.current = 0;
    setIsRecording(false);
    setRecordingTime(0);
    setHasReplay(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    setPlaybackProgress(0);
    setIsPlayingBack(false);
    setReplaySessionKey(0);
    setReplayAutoplay(false);
    setReplayStartProgress(0);
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
    pendingReplayStepMsRef.current = 0;
    setPlaybackTime(0);
    setPlaybackDuration(0);
    setPlaybackProgress(0);
    setIsPlayingBack(false);
    setReplaySessionKey(0);
    setReplayAutoplay(false);
    setReplayStartProgress(0);
  }, []);

  const handleBackToEditor = useCallback(() => {
    if (projectId) navigate(`/project/${projectId}/scene-editor`);
  }, [projectId, navigate]);

  const beginReplaySession = useCallback((autoplay: boolean, startProgress = 0) => {
    if (!replayDataRef.current) return;
    setReplayAutoplay(autoplay);
    setReplayStartProgress(Math.max(0, Math.min(1, startProgress)));
    setReplaySessionKey((prev) => prev + 1);
    setPlaybackTime(Math.round((replayDataRef.current.meta.durationMs * startProgress) / 1000));
    setPlaybackDuration(Math.round(replayDataRef.current.meta.durationMs / 1000));
    setPlaybackProgress(Math.max(0, Math.min(1, startProgress)));
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
      setPlaybackDuration(Math.round(data.meta.durationMs / 1000));
      setPlaybackProgress(0);
      setIsPlayingBack(false);
      setReplayStartProgress(0);
      downloadReplay(data);
      return;
    }

    replayPlayerRef.current = null;
    replayDataRef.current = null;
    pendingReplayStepMsRef.current = 0;
    setHasReplay(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    setPlaybackProgress(0);
    setIsPlayingBack(false);
    setReplaySessionKey(0);
    setReplayAutoplay(false);
    setReplayStartProgress(0);
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

    pendingReplayStepMsRef.current = 0;
    beginReplaySession(true, playbackProgress >= 1 ? 0 : playbackProgress);
  }, [beginReplaySession, playbackProgress]);

  const handlePauseReplay = useCallback(() => {
    replayPlayerRef.current?.pause();
    pendingReplayStepMsRef.current = 0;
    setIsPlayingBack(false);
  }, []);

  const handleSeekReplay = useCallback((nextProgress: number) => {
    if (!replayDataRef.current) return;
    replayPlayerRef.current?.pause();
    pendingReplayStepMsRef.current = 0;
    beginReplaySession(false, Math.max(0, Math.min(1, nextProgress)));
  }, [beginReplaySession]);

  const handleStepReplay = useCallback(() => {
    const replayData = replayDataRef.current;
    if (!replayData) return;

    const activePlayer = replayPlayerRef.current;
    const tickMs = replayData.tickMs;

    if (!activePlayer || activePlayer.progress >= 1) {
      pendingReplayStepMsRef.current = tickMs;
      beginReplaySession(false);
      return;
    }

    activePlayer.pause();
    pendingReplayStepMsRef.current += tickMs;
    setIsPlayingBack(false);
    setGamePaused(false);
  }, [beginReplaySession]);

  const handleStepBackReplay = useCallback(() => {
    const replayData = replayDataRef.current;
    if (!replayData || replayData.meta.durationMs <= 0) return;

    const activePlayer = replayPlayerRef.current;
    const currentTimeMs = activePlayer
      ? activePlayer.currentTimeMs
      : playbackProgress * replayData.meta.durationMs;
    const nextTimeMs = Math.max(0, currentTimeMs - replayData.tickMs);
    handleSeekReplay(nextTimeMs / replayData.meta.durationMs);
  }, [handleSeekReplay, playbackProgress]);

  const handleResetReplay = useCallback(() => {
    if (!replayDataRef.current) return;
    pendingReplayStepMsRef.current = 0;
    beginReplaySession(false);
  }, [beginReplaySession]);

  const handleDownloadReplay = useCallback(() => {
    if (replayDataRef.current) {
      downloadReplay(replayDataRef.current);
    }
  }, []);

  /* ─── Game loop ─── */
  useEffect(() => {
    return runPreviewRuntimeSession(previewRuntime, {
      runtimeHostRef,
      canvasRef,
      animationRef,
      gameStatsRef,
      highScoreRef,
      gameLoopState,
      activeScene,
      projectGenre: genreKey,
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
    });
  }, [previewRuntime, activeScene, gameStarted, gamePaused, gameOver, victory, syncRPGState, questHUDText, handleSave, isRecording, replaySessionKey, replayAutoplay, replayStartProgress]);

  // Track high score in localStorage
  useEffect(() => {
    if ((gameOver || victory) && playerScore > highScore) {
      setHighScore(playerScore);
      try { localStorage.setItem('clawgame:highScore', String(playerScore)); } catch {}
    }
  }, [gameOver, victory, playerScore, highScore]);

  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

/* ─── Keyboard Shortcuts ─── */
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle shortcuts when typing in input fields
    const target = e.target as HTMLElement;
    const isTyping = (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    if (isTyping) return;

    // Ctrl/Cmd + Space: Toggle play/pause
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      e.preventDefault();
      if (hasReplay) {
        if (isPlayingBack) {
          handlePauseReplay();
        } else {
          handlePlayReplay();
        }
      } else if (gameStarted && !gameOver) {
        handlePauseResume();
      }
    }

    // R: Restart game (when not recording)
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !isRecording) {
      e.preventDefault();
      handleRestart();
    }

    // Esc: Stop replay and reset, or close panels
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isPlayingBack) {
        handleResetReplay();
        setActivePanel('none');
      } else if (activePanel !== 'none') {
        setActivePanel('none');
      } else if (gamePaused) {
        handlePauseResume();
      }
    }

    // Ctrl/Cmd + S: Save replay (when recording is stopped and replay exists)
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && hasReplay && !isRecording) {
      e.preventDefault();
      handleDownloadReplay();
    }

    // Ctrl/Cmd + R: Start/Stop recording (when not playing)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !isPlayingBack) {
      e.preventDefault();
      handleToggleRecording();
    }

    // Ctrl/Cmd + Left Arrow: Step backward in replay
    if (
      hasReplay &&
      !isPlayingBack &&
      (e.ctrlKey || e.metaKey) &&
      e.key === 'ArrowLeft'
    ) {
      e.preventDefault();
      handleStepBackReplay();
    }

    // Ctrl/Cmd + Right Arrow: Step forward in replay
    if (
      hasReplay &&
      !isPlayingBack &&
      (e.ctrlKey || e.metaKey) &&
      e.key === 'ArrowRight'
    ) {
      e.preventDefault();
      handleStepReplay();
    }

    // F5: Quick save (in-game)
    if (e.key === 'F5' && gameStarted && !gameOver && !isRecording && !isPlayingBack) {
      e.preventDefault();
      handleSave(0); // Save to slot 0
    }

    // Tab: Toggle RPG panels (in-game)
    if (e.key === 'Tab' && gameStarted && !gameOver && !isRecording && !isPlayingBack) {
      e.preventDefault();
      const panels: UIPanel[] = ['inventory', 'quests', 'spellcraft', 'saveload'];
      const currentIndex = panels.indexOf(activePanel);
      const nextIndex = (currentIndex + 1) % panels.length;
      setActivePanel(panels[nextIndex]);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [
  hasReplay,
  isPlayingBack,
  isRecording,
  gameStarted,
  gameOver,
  gamePaused,
  activePanel,
  handlePauseReplay,
  handlePlayReplay,
  handlePauseResume,
  handleRestart,
  handleResetReplay,
  handleDownloadReplay,
  handleToggleRecording,
  handleStepBackReplay,
  handleStepReplay,
  handleSave,
  setActivePanel,
]);


  return {
    previewRuntime,
    runtimeHostRef,
    canvasRef, gameStats, gameStarted, gamePaused, gameOver, victory,
    playerScore, highScore, playerHealth, playerMana, collectedRunes, timeElapsed,
    activePanel, notifications, inventoryItems, questList,
    dialogueSpeaker, dialoguePortrait, dialogueText, dialogueChoices,
    craftingGrid, craftResult, learnedSpells, saveSlots,
    isRecording, recordingTime, hasReplay, playbackTime, playbackDuration, playbackProgress, isPlayingBack,
    controls,
    handleStartGame, handleRestart, handleBackToEditor,
    handleUseItem, handleEquipItem, handleCraftingCell, handleLearnSpell,
    handleAssignHotkey, handleSave, handleLoad, handleDeleteSave,
    handlePauseResume, handleDialogueChoice, setActivePanel,
    handleToggleRecording, handlePlayReplay, handlePauseReplay, handleSeekReplay, handleStepBackReplay, handleStepReplay, handleResetReplay, handleDownloadReplay,
  };
}
