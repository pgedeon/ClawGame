import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { ProjectScene } from '../hooks/useSceneLoader';
import type { UIPanel } from '../components/game/RPGPanels';
import type { TowerDefenseOverlayState, TowerType } from '../utils/previewTowerDefense';
import type { InventoryManager } from '../rpg/inventory';
import type { QuestManager } from '../rpg/quests';
import type { DialogueManager } from '../rpg/dialogue';
import type { SpellCraftingManager } from '../rpg/spellcrafting';
import type { CombatLogManager } from '../rpg/combatlog';
import type { ReplayRecorder, ReplayPlayer, ReplayData } from '../rpg/replay';

export interface PreviewRuntimeGameStats {
  fps: number;
  entities: number;
  memory: string;
}

export interface PreviewRuntimeGameLoopController {
  getHealth(): number;
  setHealth(value: number): void;
  getMana(): number;
  setMana(value: number): void;
  getScore(): number;
  setScore(value: number): void;
  setSelectedTowerType?(towerType: TowerType): void;
}

export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export interface PreviewRuntimeSessionOptions {
  runtimeHostRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  animationRef: MutableRefObject<number | null>;
  gameStatsRef: MutableRefObject<PreviewRuntimeGameStats>;
  highScoreRef: MutableRefObject<number>;
  gameLoopState: MutableRefObject<PreviewRuntimeGameLoopController | null>;
  activeScene: MutableRefObject<ProjectScene | null>;
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
  inventoryRef: MutableRefObject<InventoryManager | null>;
  questMgrRef: MutableRefObject<QuestManager | null>;
  dialogueMgrRef: MutableRefObject<DialogueManager | null>;
  spellMgrRef: MutableRefObject<SpellCraftingManager | null>;
  combatLogRef: MutableRefObject<CombatLogManager | null>;
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
  setActivePanel: (panel: UIPanel) => void;
  setDialogueSpeaker: StateSetter<string>;
  setDialoguePortrait: StateSetter<string>;
  setDialogueText: StateSetter<string>;
  setDialogueChoices: StateSetter<{ text: string; index: number }[]>;
  setGameStats: StateSetter<PreviewRuntimeGameStats>;
  setTowerDefenseOverlayState: StateSetter<TowerDefenseOverlayState | null>;
}
