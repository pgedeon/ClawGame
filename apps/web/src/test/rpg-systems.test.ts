/**
 * RPG System Unit Tests
 *
 * Tests for core RPG managers: Inventory, Quests, and Dialogue.
 * These are critical game systems that must work correctly for RPG features.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import RPG managers
import { InventoryManager } from '../rpg/inventory';
import { QuestManager } from '../rpg/quests';
import { DialogueManager } from '../rpg/dialogue';
import type { Item, Quest, DialogueTree } from '../rpg/types';

// ─── Test Data (factory functions to avoid mutation) ───

const createTestItem = (): Item => ({
  id: 'health-potion',
  name: 'Health Potion',
  description: 'Restores 50 HP',
  type: 'potion',
  rarity: 'common',
  icon: '🧪',
  stackable: true,
  quantity: 1,
  maxStack: 99,
  stats: { heal: 50 },
  usable: true,
  equippable: false,
  sellValue: 10,
});

const createTestWeapon = (): Item => ({
  id: 'rusty-sword',
  name: 'Rusty Sword',
  description: 'A worn but reliable blade',
  type: 'weapon',
  rarity: 'common',
  icon: '⚔️',
  stackable: false,
  quantity: 1,
  maxStack: 1,
  stats: { damage: 25 },
  usable: false,
  equippable: true,
  slot: 'weapon',
  sellValue: 25,
});

const createTestQuest = (): Quest => ({
  id: 'quest-1',
  name: 'Slime Slayer',
  description: 'Defeat 5 slimes in forest',
  status: 'inactive',
  objectives: [
    {
      id: 'obj-1',
      type: 'kill',
      description: 'Defeat slimes',
      targetId: 'slime',
      currentCount: 0,
      requiredCount: 5,
    },
  ],
  rewards: [
    { type: 'xp', amount: 100 },
    { type: 'item', itemId: 'health-potion' },
  ],
  giverNpcId: 'elder-mira',
});

const createTestDialogue = (): DialogueTree => ({
  id: 'elder-mira-greeting',
  npcName: 'Elder Mira',
  npcPortrait: '👵',
  lines: {
    'line-1': {
      id: 'line-1',
      speaker: 'Elder Mira',
      text: 'Greetings, young adventurer!',
      portrait: '👵',
      next: 'line-2',
    },
    'line-2': {
      id: 'line-2',
      speaker: 'Elder Mira',
      text: 'The forest has become dangerous lately.',
      choices: [
        { text: 'What happened?', next: 'line-3' },
        { text: 'I\'m ready for a quest!', next: 'line-4' },
      ],
    },
    'line-3': {
      id: 'line-3',
      speaker: 'Elder Mira',
      text: 'Slimes have been appearing in great numbers.',
      next: 'line-2',
    },
    'line-4': {
      id: 'line-4',
      speaker: 'Elder Mira',
      text: 'Excellent! Defeat 5 slimes and I shall reward you.',
      effect: {
        type: 'startQuest',
        payload: { questId: 'quest-1' },
      },
      next: undefined,
    },
  },
  startLineId: 'line-1',
});

// ─── Inventory Manager Tests ───

describe('InventoryManager', () => {
  let inventory: InventoryManager;

  beforeEach(() => {
    inventory = new InventoryManager();
  });

  describe('addItem', () => {
    it('should add a new item to inventory', () => {
      const result = inventory.addItem(createTestItem());
      expect(result).toBe(true);
      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0].id).toBe('health-potion');
    });

    it('should stack identical items if stackable', () => {
      inventory.addItem(createTestItem());
      const result = inventory.addItem(createTestItem());
      expect(result).toBe(true);
      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0].quantity).toBe(2);
    });

    it('should not stack beyond maxStack', () => {
      const maxedItem = { ...createTestItem(), quantity: 99 };
      inventory.addItem(maxedItem);
      const result = inventory.addItem(maxedItem);
      expect(result).toBe(false);
      expect(inventory.items[0].quantity).toBe(99);
    });

    it('should add non-stackable items as separate entries', () => {
      inventory.addItem(createTestWeapon());
      inventory.addItem(createTestWeapon());
      expect(inventory.items).toHaveLength(2);
      expect(inventory.items[0].id).toBe('rusty-sword');
      expect(inventory.items[1].id).toBe('rusty-sword');
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      inventory.addItem(createTestItem());
    });

    it('should remove one quantity from stackable item', () => {
      inventory.items[0].quantity = 5;
      const result = inventory.removeItem('health-potion', 2);
      expect(result).toBe(true);
      expect(inventory.items[0].quantity).toBe(3);
    });

    it('should remove entire stack when quantity reaches 0', () => {
      inventory.items[0].quantity = 1;
      const result = inventory.removeItem('health-potion', 1);
      expect(result).toBe(true);
      expect(inventory.items).toHaveLength(0);
    });

    it('should return false for non-existent item', () => {
      const result = inventory.removeItem('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('hasItem', () => {
    it('should return true for item in inventory', () => {
      inventory.addItem(createTestItem());
      expect(inventory.hasItem('health-potion')).toBe(true);
    });

    it('should return false for item not in inventory', () => {
      expect(inventory.hasItem('non-existent')).toBe(false);
    });
  });

  describe('useItem', () => {
    it('should use consumable item and return effect', () => {
      inventory.addItem(createTestItem());
      const result = inventory.useItem('health-potion');
      expect(result).not.toBeNull();
      expect(result?.healed).toBe(50);
      expect(inventory.items).toHaveLength(0); // item consumed
    });

    it('should return null for non-usable item', () => {
      inventory.addItem(createTestWeapon());
      const result = inventory.useItem('rusty-sword');
      expect(result).toBeNull();
      expect(inventory.items).toHaveLength(1); // item not consumed
    });

    it('should return null for non-existent item', () => {
      const result = inventory.useItem('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('equipItem', () => {
    it('should equip item to correct slot', () => {
      inventory.addItem(createTestWeapon());
      const result = inventory.equipItem('rusty-sword');
      expect(result).toBe(true);
      expect(inventory.equipment.weapon?.id).toBe('rusty-sword');
    });

    it('should return false for non-equippable item', () => {
      inventory.addItem(createTestItem());
      const result = inventory.equipItem('health-potion');
      expect(result).toBe(false);
      expect(inventory.equipment.weapon).toBeNull();
    });

    it('should return false for non-existent item', () => {
      const result = inventory.equipItem('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('unequipSlot', () => {
    beforeEach(() => {
      inventory.addItem(createTestWeapon());
      inventory.equipItem('rusty-sword');
    });

    it('should unequip item from slot', () => {
      inventory.unequipSlot('weapon');
      expect(inventory.equipment.weapon).toBeNull();
    });
  });

  describe('getWeaponDamage', () => {
    it('should return weapon damage if equipped', () => {
      inventory.addItem(createTestWeapon());
      inventory.equipItem('rusty-sword');
      expect(inventory.getWeaponDamage()).toBe(25);
    });

    it('should return default 20 if no weapon equipped', () => {
      expect(inventory.getWeaponDamage()).toBe(20);
    });
  });

  describe('getArmorDefense', () => {
    it('should return armor defense if equipped', () => {
      const armor: Item = {
        id: 'leather-armor',
        name: 'Leather Armor',
        description: 'Basic protection',
        type: 'armor',
        rarity: 'common',
        icon: '🛡️',
        stackable: false,
        quantity: 1,
        maxStack: 1,
        stats: { defense: 15 },
        usable: false,
        equippable: true,
        slot: 'armor',
        sellValue: 30,
      };
      inventory.addItem(armor);
      inventory.equipItem('leather-armor');
      expect(inventory.getArmorDefense()).toBe(15);
    });

    it('should return 0 if no armor equipped', () => {
      expect(inventory.getArmorDefense()).toBe(0);
    });
  });

  describe('serialize and load', () => {
    it('should serialize and reload inventory correctly', () => {
      inventory.addItem(createTestItem());
      inventory.addItem(createTestWeapon());
      inventory.equipItem('rusty-sword');

      const serialized = inventory.serialize();
      const newInventory = new InventoryManager();
      newInventory.load(serialized);

      expect(newInventory.items).toHaveLength(2);
      expect(newInventory.items[0].id).toBe('health-potion');
      expect(newInventory.items[1].id).toBe('rusty-sword');
      expect(newInventory.equipment.weapon?.id).toBe('rusty-sword');
    });
  });
});

// ─── Quest Manager Tests ───

describe('QuestManager', () => {
  let questManager: QuestManager;

  beforeEach(() => {
    questManager = new QuestManager();
  });

  describe('addQuest', () => {
    it('should add quest to active quests', () => {
      questManager.addQuest(createTestQuest());
      expect(questManager.quests).toHaveLength(1);
      expect(questManager.quests[0].id).toBe('quest-1');
      expect(questManager.quests[0].status).toBe('active');
    });

    it('should not add duplicate quest', () => {
      questManager.addQuest(createTestQuest());
      questManager.addQuest(createTestQuest());
      expect(questManager.quests).toHaveLength(1);
    });
  });

  describe('onKill', () => {
    beforeEach(() => {
      questManager.addQuest(createTestQuest());
    });

    it('should increment kill objective for matching enemy type', () => {
      questManager.onKill('slime');
      expect(questManager.quests[0].objectives[0].currentCount).toBe(1);
    });

    it('should not increment for non-matching enemy type', () => {
      questManager.onKill('goblin');
      expect(questManager.quests[0].objectives[0].currentCount).toBe(0);
    });

    it('should not increment for non-active quest', () => {
      questManager.quests[0].status = 'complete';
      questManager.onKill('slime');
      expect(questManager.quests[0].objectives[0].currentCount).toBe(0);
    });

    it('should auto-complete quest when all objectives met', () => {
      questManager.onKill('slime');
      questManager.onKill('slime');
      questManager.onKill('slime');
      questManager.onKill('slime');
      questManager.onKill('slime');
      expect(questManager.quests[0].status).toBe('complete');
    });

    it('should not increment beyond required', () => {
      for (let i = 0; i < 10; i++) {
        questManager.onKill('slime');
      }
      expect(questManager.quests[0].objectives[0].currentCount).toBe(5);
    });
  });

  describe('onCollect', () => {
    it('should increment collect objective for matching item', () => {
      const collectQuest: Quest = {
        ...createTestQuest(),
        id: 'quest-collect',
        objectives: [
          {
            id: 'obj-1',
            type: 'collect',
            description: 'Collect herbs',
            targetId: 'herb',
            currentCount: 0,
            requiredCount: 3,
          },
        ],
      };
      questManager.addQuest(collectQuest);

      questManager.onCollect('herb');
      questManager.onCollect('herb');
      expect(questManager.quests[0].objectives[0].currentCount).toBe(2);
    });

    it('should not increment for non-matching item', () => {
      const collectQuest: Quest = {
        ...createTestQuest(),
        id: 'quest-collect',
        objectives: [
          {
            id: 'obj-1',
            type: 'collect',
            description: 'Collect herbs',
            targetId: 'herb',
            currentCount: 0,
            requiredCount: 3,
          },
        ],
      };
      questManager.addQuest(collectQuest);

      questManager.onCollect('stone');
      expect(questManager.quests[0].objectives[0].currentCount).toBe(0);
    });
  });

  describe('getActiveQuests', () => {
    it('should return only active quests', () => {
      questManager.addQuest(createTestQuest());
      // Create another quest targeting a different enemy (stays active)
      const anotherQuest: Quest = {
        ...createTestQuest(),
        id: 'quest-2',
        objectives: [
          {
            id: 'obj-goblin',
            type: 'kill',
            description: 'Defeat goblins',
            targetId: 'goblin',
            currentCount: 0,
            requiredCount: 5,
          },
        ],
      };
      questManager.addQuest(anotherQuest);
      // Complete quest-1 by killing slimes; quest-2 targets goblins so stays active
      for (let i = 0; i < 5; i++) {
        questManager.onKill('slime');
      }

      const activeQuests = questManager.getActiveQuests();
      expect(activeQuests).toHaveLength(1);
      expect(activeQuests[0].id).toBe('quest-2'); // quest-2 targets goblins, stays active
    });
  });

  describe('getCompletedQuests', () => {
    it('should return only completed quests', () => {
      questManager.addQuest(createTestQuest());
      questManager.onKill('slime');
      questManager.onKill('slime');
      questManager.onKill('slime');
      questManager.onKill('slime');
      questManager.onKill('slime');

      const completedQuests = questManager.getCompletedQuests();
      expect(completedQuests).toHaveLength(1);
      expect(completedQuests[0].id).toBe('quest-1');
    });
  });

  describe('serialize and load', () => {
    it('should serialize and reload quests correctly', () => {
      questManager.addQuest(createTestQuest());
      questManager.onKill('slime');
      questManager.onKill('slime');

      const serialized = questManager.serialize();
      const newQuestManager = new QuestManager();
      newQuestManager.load(serialized);

      expect(newQuestManager.quests).toHaveLength(1);
      expect(newQuestManager.quests[0].id).toBe('quest-1');
      expect(newQuestManager.quests[0].objectives[0].currentCount).toBe(2);
    });
  });
});

// ─── Dialogue Manager Tests ───

describe('DialogueManager', () => {
  let dialogueManager: DialogueManager;

  beforeEach(() => {
    dialogueManager = new DialogueManager();
    dialogueManager.registerTree(createTestDialogue());
  });

  describe('registerTree', () => {
    it('should register dialogue tree', () => {
      expect(dialogueManager.flags_.quest1).toBeUndefined(); // Verify clean slate
    });
  });

  describe('startDialogue', () => {
    it('should start dialogue from first line', () => {
      const result = dialogueManager.startDialogue('elder-mira-greeting');
      expect(result).toBe(true);
      const currentLine = dialogueManager.getCurrentLine();
      expect(currentLine?.id).toBe('line-1');
      expect(currentLine?.speaker).toBe('Elder Mira');
    });

    it('should return false for non-existent dialogue', () => {
      const result = dialogueManager.startDialogue('non-existent');
      expect(result).toBe(false);
    });

    it('should set isActive to true when dialogue started', () => {
      dialogueManager.startDialogue('elder-mira-greeting');
      expect(dialogueManager.isActive()).toBe(true);
    });
  });

  describe('advance', () => {
    beforeEach(() => {
      dialogueManager.startDialogue('elder-mira-greeting');
    });

    it('should advance to next line', () => {
      dialogueManager.advance();
      const currentLine = dialogueManager.getCurrentLine();
      expect(currentLine?.id).toBe('line-2');
    });

    it('should end dialogue when no next line', () => {
      dialogueManager.advance(); // to line-2
      dialogueManager.advance(1); // to line-4 (end)
      const result = dialogueManager.advance();
      expect(result.ended).toBe(true);
      expect(dialogueManager.isActive()).toBe(false);
    });

    it('should follow choice path when choice index specified', () => {
      dialogueManager.advance(); // to line-2
      dialogueManager.advance(0); // to line-3 (first choice)
      const currentLine = dialogueManager.getCurrentLine();
      expect(currentLine?.id).toBe('line-3');
    });

    it('should return effect from current line before advancing', () => {
      dialogueManager.advance(); // to line-2
      dialogueManager.advance(1); // to line-4 (has effect)
      // getCurrentLine() now returns line-4 which has effect
      const currentLine = dialogueManager.getCurrentLine();
      expect(currentLine?.effect?.type).toBe('startQuest');
      expect(currentLine?.effect?.payload.questId).toBe('quest-1');
    });
  });

  describe('getChoices', () => {
    beforeEach(() => {
      dialogueManager.startDialogue('elder-mira-greeting');
      dialogueManager.advance(); // to line-2 which has choices
    });

    it('should return available choices', () => {
      const choices = dialogueManager.getChoices();
      expect(choices).toHaveLength(2);
      expect(choices[0].text).toBe('What happened?');
      expect(choices[1].text).toBe('I\'m ready for a quest!');
    });

    it('should return empty array when no choices available', () => {
      dialogueManager.startDialogue('elder-mira-greeting'); // back to line-1
      const choices = dialogueManager.getChoices();
      expect(choices).toHaveLength(0);
    });
  });

  describe('getCurrentLine', () => {
    it('should return null when no dialogue active', () => {
      const line = dialogueManager.getCurrentLine();
      expect(line).toBeNull();
    });

    it('should return current line when dialogue active', () => {
      dialogueManager.startDialogue('elder-mira-greeting');
      const line = dialogueManager.getCurrentLine();
      expect(line).not.toBeNull();
      expect(line?.id).toBe('line-1');
    });
  });

  describe('endDialogue', () => {
    it('should end active dialogue', () => {
      dialogueManager.startDialogue('elder-mira-greeting');
      dialogueManager.endDialogue();
      expect(dialogueManager.isActive()).toBe(false);
      expect(dialogueManager.getCurrentLine()).toBeNull();
    });
  });

  describe('flags and effects', () => {
    it('should set flag via effect', () => {
      const dialogueWithFlag: DialogueTree = {
        id: 'test-flag',
        npcName: 'Test NPC',
        npcPortrait: '🧪',
        lines: {
          'line-1': {
            id: 'line-1',
            speaker: 'NPC',
            text: 'Setting flag...',
            effect: {
              type: 'setFlag',
              payload: { flag: 'test-flag' },
            },
          },
        },
        startLineId: 'line-1',
      };
      dialogueManager.registerTree(dialogueWithFlag);
      dialogueManager.startDialogue('test-flag');
      dialogueManager.advance();

      expect(dialogueManager.flags_['test-flag']).toBe(true);
    });
  });

  describe('serialize and load', () => {
    it('should serialize and reload dialogue flags correctly', () => {
      const dialogueWithFlag: DialogueTree = {
        id: 'test-flag',
        npcName: 'Test NPC',
        npcPortrait: '🧪',
        lines: {
          'line-1': {
            id: 'line-1',
            speaker: 'NPC',
            text: 'Setting flag...',
            effect: {
              type: 'setFlag',
              payload: { flag: 'test-flag' },
            },
          },
        },
        startLineId: 'line-1',
      };
      dialogueManager.registerTree(dialogueWithFlag);
      dialogueManager.startDialogue('test-flag');
      dialogueManager.advance();

      const serialized = dialogueManager.serialize();
      const newDialogueManager = new DialogueManager();
      newDialogueManager.load(serialized);

      expect(newDialogueManager.flags_['test-flag']).toBe(true);
    });
  });
});

// ─── Integration Tests ───

describe('RPG Systems Integration', () => {
  it('should handle quest completion through gameplay', () => {
    const questManager = new QuestManager();

    // Accept quest
    questManager.addQuest(createTestQuest());

    // Complete quest objectives
    for (let i = 0; i < 5; i++) {
      questManager.onKill('slime');
    }

    // Quest should be completed
    expect(questManager.getCompletedQuests()).toHaveLength(1);
    expect(questManager.getCompletedQuests()[0].id).toBe('quest-1');
  });

  it('should handle dialogue effect on current line', () => {
    const dialogueManager = new DialogueManager();

    // Setup
    dialogueManager.registerTree(createTestDialogue());

    // Navigate dialogue to line with effect
    dialogueManager.startDialogue('elder-mira-greeting');
    dialogueManager.advance(); // to line-2
    dialogueManager.advance(1); // to line-4 (has effect)
    
    // Current line now has the effect
    const currentLine = dialogueManager.getCurrentLine();
    expect(currentLine?.effect?.type).toBe('startQuest');
    expect(currentLine?.effect?.payload.questId).toBe('quest-1');
  });

  it('should handle multiple quest objectives', () => {
    const questManager = new QuestManager();
    const multiObjectiveQuest: Quest = {
      id: 'quest-multi',
      name: 'Multi Objective',
      description: 'Kill slimes and collect herbs',
      status: 'inactive',
      objectives: [
        {
          id: 'obj-1',
          type: 'kill',
          description: 'Kill slimes',
          targetId: 'slime',
          currentCount: 0,
          requiredCount: 3,
        },
        {
          id: 'obj-2',
          type: 'collect',
          description: 'Collect herbs',
          targetId: 'herb',
          currentCount: 0,
          requiredCount: 2,
        },
      ],
      rewards: [],
    };

    questManager.addQuest(multiObjectiveQuest);

    // Complete kill objective
    questManager.onKill('slime');
    questManager.onKill('slime');
    questManager.onKill('slime');

    // Complete collect objective
    questManager.onCollect('herb');
    questManager.onCollect('herb');

    // Quest should be completed
    expect(questManager.getCompletedQuests()).toHaveLength(1);
    expect(multiObjectiveQuest.objectives[0].currentCount).toBe(3);
    expect(multiObjectiveQuest.objectives[1].currentCount).toBe(2);
  });

  it('should use item after receiving as inventory item', () => {
    const inventory = new InventoryManager();

    // Add item
    inventory.addItem(createTestItem());

    // Use item
    const result = inventory.useItem('health-potion');
    expect(result).not.toBeNull();
    expect(result?.healed).toBe(50);
    expect(inventory.items).toHaveLength(0);
  });
});
