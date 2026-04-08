/**
 * @clawgame/web - RPG State Hook
 * Manages RPG managers (inventory, quests, spells, dialogue, save/load)
 * and provides reactive state for the UI.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { InventoryManager } from '../rpg/inventory';
import { QuestManager } from '../rpg/quests';
import { SpellCraftingManager } from '../rpg/spellcrafting';
import { DialogueManager } from '../rpg/dialogue';
import { SaveLoadManager } from '../rpg/saveload';
import type { Item } from '../rpg/types';

export type ActivePanel = 'none' | 'inventory' | 'quests' | 'spells' | 'dialogue';

export interface RPGState {
  inventory: InventoryManager;
  questManager: QuestManager;
  spellManager: SpellCraftingManager;
  dialogueManager: DialogueManager;
  saveManager: SaveLoadManager;

  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;

  dialogueSpeaker: string;
  dialoguePortrait: string;
  dialogueText: string;
  dialogueChoices: Array<{ text: string; index: number }>;
  setDialogueState: (speaker: string, portrait: string, text: string, choices: Array<{ text: string; index: number }>) => void;

  saveSlots: Array<any | null>;
  refreshSaveSlots: () => void;

  syncRPGState: () => void;

  inventoryItems: Item[];
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  activeQuests: any[];
  craftingGrid: (string | null)[][];
  knownRecipes: any[];
  collectedRunes: string[];
  setCollectedRunes: (runes: string[]) => void;
}

export function useRPGState(): RPGState {
  const invRef = useRef(new InventoryManager());
  const questRef = useRef(new QuestManager());
  const spellRef = useRef(new SpellCraftingManager());
  const dialogueRef = useRef(new DialogueManager());
  const saveRef = useRef(new SaveLoadManager());

  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [dialogueSpeaker, setDialogueSpeaker] = useState('');
  const [dialoguePortrait, setDialoguePortrait] = useState('💬');
  const [dialogueText, setDialogueText] = useState('');
  const [dialogueChoices, setDialogueChoices] = useState<Array<{ text: string; index: number }>>([]);

  const [saveSlots, setSaveSlots] = useState<Array<any | null>>([null, null, null]);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [equippedWeapon, setEquippedWeapon] = useState<Item | null>(null);
  const [equippedArmor, setEquippedArmor] = useState<Item | null>(null);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [craftingGrid, setCraftingGrid] = useState<(string | null)[][]>(
    Array.from({ length: 3 }, () => Array(3).fill(null))
  );
  const [knownRecipes, setKnownRecipes] = useState<any[]>([]);
  const [collectedRunes, setCollectedRunes] = useState<string[]>([]);

  const setDialogueState = useCallback((speaker: string, portrait: string, text: string, choices: Array<{ text: string; index: number }>) => {
    setDialogueSpeaker(speaker);
    setDialoguePortrait(portrait);
    setDialogueText(text);
    setDialogueChoices(choices);
  }, []);

  const syncRPGState = useCallback(() => {
    const inv = invRef.current;
    setInventoryItems([...inv.items]);
    setEquippedWeapon(inv.equipment.weapon || null);
    setEquippedArmor(inv.equipment.armor || null);
    setActiveQuests(questRef.current.getActiveQuests());
    setCraftingGrid(spellRef.current.grid.map((r: (string | null)[]) => [...r]));
    setKnownRecipes([...spellRef.current.learnedSpells]);
  }, []);

  const refreshSaveSlots = useCallback(() => {
    const slots: Array<any | null> = [null, null, null];
    for (let i = 0; i < 3; i++) {
      try { slots[i] = saveRef.current.load(i); } catch { slots[i] = null; }
    }
    setSaveSlots(slots);
  }, []);

  useEffect(() => { refreshSaveSlots(); }, [refreshSaveSlots]);

  return {
    inventory: invRef.current,
    questManager: questRef.current,
    spellManager: spellRef.current,
    dialogueManager: dialogueRef.current,
    saveManager: saveRef.current,

    activePanel,
    setActivePanel,
    dialogueSpeaker,
    dialoguePortrait,
    dialogueText,
    dialogueChoices,
    setDialogueState,

    saveSlots,
    refreshSaveSlots,

    syncRPGState,
    inventoryItems,
    equippedWeapon,
    equippedArmor,
    activeQuests,
    craftingGrid,
    knownRecipes,
    collectedRunes,
    setCollectedRunes,
  };
}
