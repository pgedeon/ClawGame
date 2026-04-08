/**
 * Core RPG type definitions for Eclipse of Runes
 */

// ─── Inventory ───

export type ItemType = 'weapon' | 'armor' | 'potion' | 'rune' | 'quest' | 'misc';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string; // emoji
  stackable: boolean;
  quantity: number;
  maxStack: number;
  stats?: Record<string, number>;
  usable?: boolean;
  equippable?: boolean;
  slot?: 'weapon' | 'armor' | 'accessory';
  sellValue: number;
}

export interface EquipmentSlots {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}

// ─── Dialogue ───

export interface DialogueLine {
  id: string;
  speaker: string;
  portrait?: string; // emoji or identifier
  text: string;
  choices?: DialogueChoice[];
  next?: string; // next line id
  effect?: DialogueEffect;
  condition?: DialogueCondition;
}

export interface DialogueChoice {
  text: string;
  next: string; // line id to jump to
  condition?: DialogueCondition;
}

export interface DialogueEffect {
  type: 'startQuest' | 'giveItem' | 'heal' | 'teleport' | 'setFlag';
  payload: Record<string, any>;
}

export interface DialogueCondition {
  type: 'hasItem' | 'questActive' | 'questComplete' | 'flagSet' | 'levelGte';
  payload: Record<string, any>;
}

export interface DialogueTree {
  id: string;
  npcName: string;
  npcPortrait: string;
  lines: Record<string, DialogueLine>;
  startLineId: string;
}

// ─── Quests ───

export type QuestStatus = 'inactive' | 'active' | 'complete' | 'failed';
export type QuestObjectiveType = 'kill' | 'collect' | 'talk' | 'explore' | 'craft';

export interface QuestObjective {
  id: string;
  type: QuestObjectiveType;
  description: string;
  targetId: string; // enemy type, item id, npc id, location id
  currentCount: number;
  requiredCount: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  giverNpcId?: string;
  completionText?: string;
}

export interface QuestReward {
  type: 'xp' | 'item' | 'gold';
  amount?: number;
  itemId?: string;
}

// ─── Spell Crafting ───

export type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'shadow' | 'light' | 'neutral';

export interface Rune {
  id: string;
  name: string;
  element: ElementType;
  icon: string;
  power: number;
}

export interface SpellRecipe {
  id: string;
  name: string;
  description: string;
  pattern: (string | null)[][]; // 3x3 grid of element types or null
  element: ElementType;
  damage: number;
  manaCost: number;
  cooldown: number;
  icon: string;
  projectileSpeed: number;
  projectileColor: string;
  effectType: 'projectile' | 'aoe' | 'buff' | 'heal';
}

export interface LearnedSpell {
  id: string;
  recipeId: string;
  name: string;
  icon: string;
  element: ElementType;
  damage: number;
  manaCost: number;
  cooldown: number;
  projectileSpeed: number;
  projectileColor: string;
  effectType: 'projectile' | 'aoe' | 'buff' | 'heal';
  hotkey: number | null; // 1-8
  currentCooldown: number;
}

// ─── Save/Load ───

export interface SaveSlot {
  id: number;
  name: string;
  timestamp: number;
  screenshot?: string;
  playTime: number;
  data: SaveData;
}

export interface SaveData {
  playerPosition: { x: number; y: number };
  playerHealth: number;
  playerScore: number;
  inventory: Item[];
  equipment: EquipmentSlots;
  quests: Quest[];
  learnedSpells: LearnedSpell[];
  collectedRunes: string[];
  defeatedEnemies: string[];
  dialogueFlags: Record<string, boolean>;
  gameTime: number;
  entities: SerializedEntity[];
}

export interface SerializedEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  health?: number;
  active: boolean;
}

// ─── Notifications ───

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'quest' | 'loot';

export interface GameNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  duration: number;
  createdAt: number;
}
