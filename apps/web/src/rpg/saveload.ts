/**
 * Save/Load System — localStorage-based save slots
 */
import { SaveSlot, SaveData, Item, EquipmentSlots, Quest, LearnedSpell, SerializedEntity } from './types';
import { InventoryManager } from './inventory';
import { QuestManager } from './quests';
import { SpellCraftingManager } from './spellcrafting';
import { DialogueManager } from './dialogue';
import { notify } from './notifications';

const SAVE_KEY_PREFIX = 'clawgame_save_';

export class SaveLoadManager {
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
        x: e.transform.x,
        y: e.transform.y,
        health: e.health,
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
      const slot: SaveSlot = {
        id: slotId,
        name: name || `Save ${slotId}`,
        timestamp: Date.now(),
        playTime: data.gameTime,
        data,
      };
      localStorage.setItem(SAVE_KEY_PREFIX + slotId, JSON.stringify(slot));
      notify('success', 'Game Saved', `Slot ${slotId} saved`);
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
      return slot.data;
    } catch {
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
      const raw = localStorage.getItem(SAVE_KEY_PREFIX + i);
      if (raw) {
        try { saves.push(JSON.parse(raw)); } catch { /* skip */ }
      }
    }
    return saves;
  }
}
