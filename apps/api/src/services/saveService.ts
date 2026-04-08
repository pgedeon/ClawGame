/**
 * @clawgame/api - Save/Load Service
 * Manages game save state persistence per project.
 *
 * Save slots:
 *  - "quicksave" (F5 quick save)
 *  - "slot-1" through "slot-5" (manual saves)
 *
 * Each save stores: player state, entities, quest progress, inventory, timestamp.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const PROJECTS_DIR = process.env.PROJECTS_DIR || './data/projects';

// ─── Types ───

export interface PlayerSaveState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  attack: number;
  defense: number;
  speed: number;
  score: number;
  enemiesDefeated: number;
  runes: string[];
  facing: string;
}

export interface EntitySaveState {
  id: string;
  type: string;
  alive: boolean;
  hp?: number;
  x?: number;
  y?: number;
  // per-entity custom data
  [key: string]: unknown;
}

export interface QuestProgress {
  id: string;
  state: 'not_started' | 'active' | 'completed' | 'failed';
  objectives: Array<{
    target: string;
    current: number;
  }>;
}

export interface InventorySaveState {
  slots: Array<{
    itemId: string;
    quantity: number;
  } | null>;
  gold: number;
}

export interface DialogueSaveState {
  triggeredIds: string[];
  /** flags set by dialogue effects */
  flags: Record<string, boolean>;
}

export interface SpellSaveState {
  learnedSpellIds: string[];
  equippedSlots: Array<string | null>;
}

export interface GameSave {
  /** ISO timestamp */
  timestamp: string;
  /** Slot identifier: "quicksave" | "slot-1" | "slot-2" | ... | "slot-5" */
  slot: string;
  /** Player-provided description for manual saves */
  description: string;
  /** Name of the scene/map the player is on */
  sceneName: string;
  /** Total play-time in seconds at save point */
  playTimeSeconds: number;
  /** Player stats & position */
  player: PlayerSaveState;
  /** Tracked entity states (enemies killed, NPCs moved, etc.) */
  entities: EntitySaveState[];
  /** Quest progress */
  quests: QuestProgress[];
  /** Inventory state */
  inventory: InventorySaveState;
  /** Dialogue state */
  dialogue: DialogueSaveState;
  /** Spell state */
  spells: SpellSaveState;
  /** Collected item IDs (for respawn prevention) */
  collectedItemIds: string[];
  /** Arbitrary game-specific data the game script may store */
  customData: Record<string, unknown>;
}

export interface SaveSlotInfo {
  slot: string;
  timestamp: string;
  description: string;
  sceneName: string;
  playTimeSeconds: number;
  playerLevel: number;
  playerHp: number;
  playerMaxHp: number;
}

// ─── Helpers ───

const VALID_SLOTS = new Set([
  'quicksave',
  'slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5',
]);

function savesDir(projectId: string): string {
  return join(PROJECTS_DIR, projectId, 'saves');
}

function savePath(projectId: string, slot: string): string {
  return join(savesDir(projectId), `${slot}.json`);
}

function isValidSlot(slot: string): boolean {
  return VALID_SLOTS.has(slot);
}

// ─── Service ───

export class SaveService {
  /**
   * Write a save to a slot. Overwrites if exists.
   */
  async saveGame(projectId: string, slot: string, data: GameSave): Promise<GameSave> {
    if (!isValidSlot(slot)) {
      throw new Error(`Invalid save slot: "${slot}". Must be one of: ${[...VALID_SLOTS].join(', ')}`);
    }

    const dir = savesDir(projectId);
    await mkdir(dir, { recursive: true });

    data.slot = slot;
    data.timestamp = new Date().toISOString();

    const filePath = savePath(projectId, slot);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return data;
  }

  /**
   * Load a save from a slot.
   */
  async loadGame(projectId: string, slot: string): Promise<GameSave | null> {
    if (!isValidSlot(slot)) {
      throw new Error(`Invalid save slot: "${slot}"`);
    }

    const filePath = savePath(projectId, slot);
    if (!existsSync(filePath)) {
      return null;
    }

    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as GameSave;
  }

  /**
   * Delete a save from a slot.
   */
  async deleteSave(projectId: string, slot: string): Promise<boolean> {
    if (!isValidSlot(slot)) {
      throw new Error(`Invalid save slot: "${slot}"`);
    }

    const filePath = savePath(projectId, slot);
    if (!existsSync(filePath)) {
      return false;
    }

    await unlink(filePath);
    return true;
  }

  /**
   * List all saves for a project with summary info (no full state).
   */
  async listSaves(projectId: string): Promise<SaveSlotInfo[]> {
    const dir = savesDir(projectId);
    if (!existsSync(dir)) {
      return [];
    }

    const files = await readdir(dir);
    const saves: SaveSlotInfo[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(dir, file), 'utf-8');
        const data = JSON.parse(content) as GameSave;
        saves.push({
          slot: data.slot,
          timestamp: data.timestamp,
          description: data.description || '',
          sceneName: data.sceneName || '',
          playTimeSeconds: data.playTimeSeconds || 0,
          playerLevel: data.player?.level || 1,
          playerHp: data.player?.hp || 0,
          playerMaxHp: data.player?.maxHp || 0,
        });
      } catch {
        // Corrupt save file — skip
      }
    }

    return saves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
