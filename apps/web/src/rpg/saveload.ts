/**
 * Save/Load System — localStorage-based save slots with auto-save
 */
import { SaveSlot, SaveData, Item, EquipmentSlots, Quest, LearnedSpell, SerializedEntity } from './types';
import { InventoryManager } from './inventory';
import { QuestManager } from './quests';
import { SpellCraftingManager } from './spellcrafting';
import { DialogueManager } from './dialogue';
import { notify } from './notifications';

const SAVE_KEY_PREFIX = 'clawgame_save_';
const AUTOSAVE_SLOT = 9;
const AUTOSAVE_INTERVAL_MS = 60_000; // 60 seconds
const SAVE_VERSION = 2;

export class SaveLoadManager {
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private lastAutoSave = 0;

  /**
   * Validate that save data has the expected structure.
   * Returns true if data looks valid, false otherwise.
   */
  validateSaveData(data: any): data is SaveData {
    if (!data || typeof data !== 'object') return false;
    // Must have at least playerPosition
    if (!data.playerPosition || typeof data.playerPosition.x !== 'number') return false;
    // If inventory exists, must be array
    if (data.inventory !== undefined && !Array.isArray(data.inventory)) return false;
    // If quests exists, must be array
    if (data.quests !== undefined && !Array.isArray(data.quests)) return false;
    return true;
  }

  serializeGameState(opts: {
    playerPosition: { x: number; y: number };
    playerHealth: number;
    playerScore: number;
    inventory: InventoryManager;
    questManager: QuestManager;
    spellManager: SpellCraftingManager;
    dialogueManager: DialogueManager;
    collectedRunes: string[];
    defeatedEnemies: string[];
    gameTime: number;
    entities: Map<string, any>;
  }): SaveData {
    const { inventory, questManager, spellManager, dialogueManager, entities } = opts;
    const invData = inventory.serialize();
    const serialized: SerializedEntity[] = [];
    entities.forEach((e, id) => {
      serialized.push({
        id,
        type: e.type,
        x: e.transform?.x ?? 0,
        y: e.transform?.y ?? 0,
        health: e.health ?? 0,
        active: true,
      });
    });
    return {
      playerPosition: opts.playerPosition,
      playerHealth: opts.playerHealth,
      playerScore: opts.playerScore,
      inventory: invData.items,
      equipment: invData.equipment,
      quests: questManager.serialize(),
      learnedSpells: spellManager.serialize(),
      collectedRunes: [...opts.collectedRunes],
      defeatedEnemies: [...opts.defeatedEnemies],
      dialogueFlags: dialogueManager.serialize(),
      gameTime: opts.gameTime,
      entities: serialized,
    };
  }

  save(slotId: number, data: SaveData, name?: string): boolean {
    try {
      if (!this.validateSaveData(data)) {
        notify('error', 'Save Failed', 'Invalid save data structure');
        return false;
      }
      const slot: SaveSlot = {
        id: slotId,
        name: name || (slotId === AUTOSAVE_SLOT ? 'Auto-Save' : `Save ${slotId}`),
        timestamp: Date.now(),
        playTime: data.gameTime,
        data,
      };
      const json = JSON.stringify(slot);
      // Check quota before writing
      try {
        localStorage.setItem(SAVE_KEY_PREFIX + slotId, json);
      } catch (quotaErr) {
        notify('error', 'Save Failed', 'Storage is full. Delete old saves.');
        return false;
      }
      if (slotId !== AUTOSAVE_SLOT) {
        notify('success', 'Game Saved', `Slot ${slotId} saved`);
      }
      return true;
    } catch {
      notify('error', 'Save Failed', 'Could not save game');
      return false;
    }
  }

  load(slotId: number): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY_PREFIX + slotId);
      if (!raw) return null;
      const slot: SaveSlot = JSON.parse(raw);
      if (!this.validateSaveData(slot.data)) {
        notify('error', 'Load Failed', `Save slot ${slotId} is corrupted`);
        return null;
      }
      return slot.data;
    } catch {
      notify('error', 'Load Failed', `Could not load slot ${slotId}`);
      return null;
    }
  }

  deleteSave(slotId: number): boolean {
    localStorage.removeItem(SAVE_KEY_PREFIX + slotId);
    notify('info', 'Save Deleted', `Slot ${slotId} removed`);
    return true;
  }

  listSaves(): SaveSlot[] {
    const saves: SaveSlot[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const raw = localStorage.getItem(SAVE_KEY_PREFIX + i);
        if (raw) {
          const slot = JSON.parse(raw);
          if (this.validateSaveData(slot.data)) {
            saves.push(slot);
          }
        }
      } catch { /* skip corrupted */ }
    }
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  }

  getAutoSave(): SaveData | null {
    return this.load(AUTOSAVE_SLOT);
  }

  hasAutoSave(): boolean {
    return localStorage.getItem(SAVE_KEY_PREFIX + AUTOSAVE_SLOT) !== null;
  }

  /**
   * Start auto-save timer. Call with a function that returns current game state.
   */
  startAutoSave(getSaveData: () => SaveData | null): void {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      const data = getSaveData();
      if (data && this.validateSaveData(data)) {
        this.save(AUTOSAVE_SLOT, data);
        this.lastAutoSave = Date.now();
      }
    }, AUTOSAVE_INTERVAL_MS);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  getLastAutoSaveTime(): number {
    return this.lastAutoSave;
  }
}
