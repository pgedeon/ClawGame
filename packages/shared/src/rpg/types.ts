/**
 * @clawgame/shared - RPG System Type Definitions
 *
 * Shared types for the RPG systems: Dialogue, Quest, Inventory, Spells, Saves.
 * These types are used by both the game engine scripts and the web UI components.
 */

// ═══════════════════════════════════════════════════
// DIALOGUE SYSTEM
// ═══════════════════════════════════════════════════

export interface DialogueChoice {
  /** Display text for this choice */
  text: string;
  /** Index of the next line to jump to (-1 = end dialogue) */
  next: number;
  /** Optional effects when this choice is selected */
  effect?: DialogueEffect;
}

export interface DialogueEffect {
  /** Set a quest to a new state */
  startQuest?: string;
  /** Complete a quest */
  completeQuest?: string;
  /** Give items to the player */
  giveItems?: Array<{ itemId: string; quantity?: number }>;
  /** Set a dialogue flag (for conditional branching) */
  setFlag?: string;
  /** Modify NPC relationship value */
  npcRelation?: { npcId: string; delta: number };
  /** Heal/damage the player */
  healPlayer?: number;
  /** Give gold */
  giveGold?: number;
}

export interface DialogueLine {
  /** Who is speaking (empty = narrator) */
  speaker: string;
  /** The text content */
  text: string;
  /** Optional portrait image URL or emoji */
  portrait?: string;
  /** Choices presented at this line (if empty, click to advance) */
  choices?: DialogueChoice[];
  /** Conditional: only show if all conditions are met */
  condition?: DialogueCondition;
}

export interface DialogueCondition {
  /** Quest must be in this state */
  questState?: { questId: string; state: string };
  /** Player must have this item */
  hasItem?: string;
  /** Dialogue flag must be set */
  flagSet?: string;
  /** NPC relationship threshold */
  npcRelationGte?: { npcId: string; value: number };
  /** Custom flag check */
  customFlag?: string;
}

export interface DialogueDef {
  id: string;
  /** Human-readable name */
  name?: string;
  /** Lines of dialogue */
  lines: DialogueLine[];
  /** How this dialogue is triggered */
  trigger: 'proximity' | 'interact' | 'auto';
  /** Only trigger once per game? */
  once?: boolean;
  /** Position for proximity trigger */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// ═══════════════════════════════════════════════════
// QUEST SYSTEM
// ═══════════════════════════════════════════════════

export type ObjectiveType = 'kill' | 'collect' | 'talk' | 'explore' | 'craft' | 'custom';

export interface QuestObjective {
  /** What to track */
  type: ObjectiveType;
  /** Target identifier (enemy type, item id, NPC id, location id) */
  target: string;
  /** Human-readable description */
  description: string;
  /** Current progress */
  current: number;
  /** Required to complete */
  required: number;
}

export interface QuestReward {
  xp?: number;
  gold?: number;
  items?: Array<{ itemId: string; quantity: number }>;
  spells?: string[];
  /** Unlocks another quest */
  unlocksQuest?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  /** Quest giver NPC id */
  giverNpcId?: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  /** Quests that must be completed before this one is available */
  prerequisites?: string[];
  /** Initial state */
  initialState?: 'not_started' | 'active' | 'completed' | 'failed';
}

export interface QuestProgress {
  id: string;
  state: 'not_started' | 'active' | 'completed' | 'failed';
  objectives: Array<{
    target: string;
    current: number;
  }>;
}

// ═══════════════════════════════════════════════════
// INVENTORY SYSTEM
// ═══════════════════════════════════════════════════

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'key' | 'quest' | 'rune' | 'spell_scroll';

export interface ItemDef {
  id: string;
  name: string;
  /** Plural name (defaults to name + 's') */
  pluralName?: string;
  type: ItemType;
  /** Can multiple stack in one slot? */
  stackable: boolean;
  /** Max stack size */
  maxStack: number;
  /** Equipment stat bonuses */
  stats?: {
    attack?: number;
    defense?: number;
    hp?: number;
    mp?: number;
    speed?: number;
  };
  /** Effect when used/consumed */
  effect?: {
    type: 'heal_hp' | 'heal_mp' | 'buff' | 'damage' | 'teleport' | 'custom';
    value: number;
    duration?: number; // for buffs, in seconds
  };
  /** Icon identifier (emoji or asset key) */
  icon: string;
  /** Short flavor text */
  description?: string;
  /** Shop sell price (0 = not sellable) */
  sellPrice?: number;
  /** Rarity for color coding */
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

export interface InventoryState {
  slots: Array<InventorySlot | null>;
  maxSlots: number;
  gold: number;
}

// ═══════════════════════════════════════════════════
// SPELL CRAFTING SYSTEM
// ═══════════════════════════════════════════════════

export type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'light' | 'dark' | 'arcane';

export interface SpellRune {
  /** Which element this rune contributes */
  type: ElementType;
  /** Position on the crafting grid (0-8 for a 3x3 grid) */
  position: number;
  /** Power level of this rune (affects damage/effect) */
  power: number;
}

export interface SpellDef {
  id: string;
  name: string;
  description: string;
  /** Rune layout for this spell recipe */
  elements: SpellRune[];
  /** Base cooldown in seconds */
  cooldown: number;
  /** MP cost to cast */
  cost: number;
  /** Base damage / healing / effect power */
  power: number;
  /** Spell range in pixels */
  range?: number;
  /** Cast time in seconds (0 = instant) */
  castTime?: number;
  /** AoE radius (0 = single target) */
  aoeRadius?: number;
  /** Visual effect key */
  vfx?: string;
}

export interface PlayerSpells {
  /** IDs of learned spell recipes */
  learned: string[];
  /** Equipped spell slots (mapped to hotkeys 1-8) */
  equipped: Array<string | null>;
  /** Max equippable spells */
  maxSpells: number;
}

// ═══════════════════════════════════════════════════
// SAVE SYSTEM
// ═══════════════════════════════════════════════════

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
  [key: string]: unknown;
}

export interface InventorySaveState {
  slots: Array<{ itemId: string; quantity: number } | null>;
  gold: number;
}

export interface DialogueSaveState {
  triggeredIds: string[];
  flags: Record<string, boolean>;
}

export interface SpellSaveState {
  learnedSpellIds: string[];
  equippedSlots: Array<string | null>;
}

export interface GameSave {
  timestamp: string;
  slot: string;
  description: string;
  sceneName: string;
  playTimeSeconds: number;
  player: PlayerSaveState;
  entities: EntitySaveState[];
  quests: QuestProgress[];
  inventory: InventorySaveState;
  dialogue: DialogueSaveState;
  spells: SpellSaveState;
  collectedItemIds: string[];
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

// ═══════════════════════════════════════════════════
// GAME EVENT SYSTEM (for inter-system communication)
// ═══════════════════════════════════════════════════

export type GameEventType =
  | 'entity_killed'
  | 'item_collected'
  | 'dialogue_completed'
  | 'quest_started'
  | 'quest_objective_updated'
  | 'quest_completed'
  | 'spell_cast'
  | 'player_damaged'
  | 'player_healed'
  | 'inventory_changed'
  | 'zone_entered'
  | 'save_requested'
  | 'load_requested'
  | 'notification';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════
// FULL RPG GAME STATE (serializable)
// ═══════════════════════════════════════════════════

export interface RpgGameState {
  player: PlayerSaveState;
  entities: EntitySaveState[];
  quests: QuestProgress[];
  inventory: InventorySaveState;
  dialogue: DialogueSaveState;
  spells: SpellSaveState;
  collectedItemIds: string[];
  customData: Record<string, unknown>;
}
