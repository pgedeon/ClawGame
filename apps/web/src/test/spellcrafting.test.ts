/**
 * SpellCrafting System Tests
 * Tests for 3x3 rune grid, recipe matching, learning, hotkeys, cooldowns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpellCraftingManager } from '../rpg/spellcrafting';
import { SPELL_RECIPES } from '../rpg/data/recipes';
import type { ElementType } from '../rpg/types';

describe('SpellCraftingManager', () => {
  let mgr: SpellCraftingManager;

  beforeEach(() => {
    mgr = new SpellCraftingManager();
  });

  describe('Grid operations', () => {
    it('starts with empty 3x3 grid', () => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(mgr.grid[r][c]).toBeNull();
        }
      }
    });

    it('setCell places element', () => {
      mgr.setCell(1, 1, 'fire');
      expect(mgr.grid[1][1]).toBe('fire');
    });

    it('setCell ignores out-of-bounds', () => {
      mgr.setCell(-1, 0, 'fire');
      mgr.setCell(3, 0, 'fire');
      mgr.setCell(0, -1, 'fire');
      mgr.setCell(0, 3, 'fire');
      // No crash, grid unchanged
      expect(mgr.grid[0][0]).toBeNull();
    });

    it('clearGrid resets all cells', () => {
      mgr.setCell(0, 0, 'fire');
      mgr.setCell(1, 1, 'water');
      mgr.clearGrid();
      expect(mgr.grid[0][0]).toBeNull();
      expect(mgr.grid[1][1]).toBeNull();
    });
  });

  describe('Recipe matching', () => {
    it('finds fireball pattern', () => {
      // Fireball: cross pattern
      mgr.setCell(0, 1, 'fire');
      mgr.setCell(1, 0, 'fire');
      mgr.setCell(1, 1, 'fire');
      mgr.setCell(1, 2, 'fire');
      mgr.setCell(2, 1, 'fire');
      const match = mgr.findMatch();
      expect(match).not.toBeNull();
      expect(match!.id).toBe('fireball');
    });

    it('returns null for no match', () => {
      mgr.setCell(0, 0, 'fire');
      expect(mgr.findMatch()).toBeNull();
    });

    it('returns null for empty grid', () => {
      expect(mgr.findMatch()).toBeNull();
    });

    it('matches different recipes with different patterns', () => {
      // Ice shard pattern
      mgr.setCell(0, 1, 'water');
      mgr.setCell(1, 0, 'water');
      mgr.setCell(1, 1, 'air');
      mgr.setCell(1, 2, 'water');
      mgr.setCell(2, 1, 'water');
      const match = mgr.findMatch();
      expect(match).not.toBeNull();
      expect(match!.id).toBe('ice-shard');
    });
  });

  describe('Learning spells', () => {
    it('learns a spell from recipe', () => {
      const recipe = SPELL_RECIPES[0];
      const spell = mgr.learnSpell(recipe);
      expect(spell).not.toBeNull();
      expect(spell!.name).toBe(recipe.name);
      expect(spell!.recipeId).toBe(recipe.id);
      expect(mgr.learnedSpells.length).toBe(1);
    });

    it('does not learn duplicate spell', () => {
      const recipe = SPELL_RECIPES[0];
      mgr.learnSpell(recipe);
      const second = mgr.learnSpell(recipe);
      expect(second).toBeNull();
      expect(mgr.learnedSpells.length).toBe(1);
    });

    it('assigns unique spell IDs', () => {
      const r1 = SPELL_RECIPES[0];
      const r2 = SPELL_RECIPES[1];
      const s1 = mgr.learnSpell(r1)!;
      const s2 = mgr.learnSpell(r2)!;
      expect(s1.id).not.toBe(s2.id);
    });

    it('learned spell has correct stats', () => {
      const recipe = SPELL_RECIPES[0]; // fireball
      const spell = mgr.learnSpell(recipe)!;
      expect(spell.damage).toBe(recipe.damage);
      expect(spell.manaCost).toBe(recipe.manaCost);
      expect(spell.cooldown).toBe(recipe.cooldown);
      expect(spell.hotkey).toBeNull();
      expect(spell.currentCooldown).toBe(0);
    });
  });

  describe('Hotkey assignment', () => {
    it('assigns hotkey to spell', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      expect(mgr.assignHotkey(spell.id, 1)).toBe(true);
      expect(spell.hotkey).toBe(1);
    });

    it('rejects hotkey out of range [1, 8]', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      expect(mgr.assignHotkey(spell.id, 0)).toBe(false);
      expect(mgr.assignHotkey(spell.id, 9)).toBe(false);
    });

    it('rejects hotkey for non-existent spell', () => {
      expect(mgr.assignHotkey('fake-id', 1)).toBe(false);
    });

    it('unassigns previous owner of hotkey', () => {
      const s1 = mgr.learnSpell(SPELL_RECIPES[0])!;
      const s2 = mgr.learnSpell(SPELL_RECIPES[1])!;
      mgr.assignHotkey(s1.id, 3);
      mgr.assignHotkey(s2.id, 3);
      expect(s1.hotkey).toBeNull();
      expect(s2.hotkey).toBe(3);
    });

    it('getSpellByHotkey returns correct spell', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      mgr.assignHotkey(spell.id, 5);
      expect(mgr.getSpellByHotkey(5)).toBe(spell);
    });

    it('getSpellByHotkey returns null for empty slot', () => {
      expect(mgr.getSpellByHotkey(1)).toBeNull();
    });
  });

  describe('Cooldowns', () => {
    it('castSpell puts spell on cooldown', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      mgr.assignHotkey(spell.id, 1);
      const cast = mgr.castSpell(1);
      expect(cast).toBe(spell);
      expect(spell.currentCooldown).toBe(spell.cooldown);
    });

    it('castSpell fails when on cooldown', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      mgr.assignHotkey(spell.id, 1);
      mgr.castSpell(1);
      const second = mgr.castSpell(1);
      expect(second).toBeNull();
    });

    it('castSpell fails for empty hotkey', () => {
      expect(mgr.castSpell(1)).toBeNull();
    });

    it('tickCooldowns reduces cooldown', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      mgr.assignHotkey(spell.id, 1);
      mgr.castSpell(1);
      expect(spell.currentCooldown).toBe(1000);
      mgr.tickCooldowns(400);
      expect(spell.currentCooldown).toBe(600);
    });

    it('tickCooldowns floors at 0', () => {
      const spell = mgr.learnSpell(SPELL_RECIPES[0])!;
      mgr.assignHotkey(spell.id, 1);
      mgr.castSpell(1);
      mgr.tickCooldowns(99999);
      expect(spell.currentCooldown).toBe(0);
    });
  });

  describe('Serialize / Load', () => {
    it('serializes learned spells', () => {
      mgr.learnSpell(SPELL_RECIPES[0]);
      mgr.learnSpell(SPELL_RECIPES[1]);
      const data = mgr.serialize();
      expect(data.length).toBe(2);
      expect(data[0].name).toBeDefined();
    });

    it('load restores spells', () => {
      mgr.learnSpell(SPELL_RECIPES[0]);
      mgr.learnSpell(SPELL_RECIPES[1]);
      const data = mgr.serialize();

      const mgr2 = new SpellCraftingManager();
      mgr2.load(data);
      expect(mgr2.learnedSpells.length).toBe(2);
    });

    it('load restores nextSpellId correctly', () => {
      mgr.learnSpell(SPELL_RECIPES[0]);
      mgr.learnSpell(SPELL_RECIPES[1]);
      mgr.learnSpell(SPELL_RECIPES[2]);
      const data = mgr.serialize();

      const mgr2 = new SpellCraftingManager();
      mgr2.load(data);
      // Next spell should not collide with loaded IDs
      const s4 = mgr2.learnSpell(SPELL_RECIPES[3]);
      expect(s4).not.toBeNull();
      // Ensure ID is unique vs loaded spells
      const ids = mgr2.learnedSpells.map(s => s.id);
      expect(new Set(ids).size).toBe(4);
    });
  });
});
