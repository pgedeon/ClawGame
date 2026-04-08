/**
 * Spell Crafting System — 3x3 rune grid, recipe matching, learning spells
 */
import { SpellRecipe, LearnedSpell, ElementType } from './types';
import { SPELL_RECIPES } from './data/recipes';
import { notify } from './notifications';

export class SpellCraftingManager {
  grid: (ElementType | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  learnedSpells: LearnedSpell[] = [];
  private nextSpellId = 1;

  setCell(row: number, col: number, element: ElementType | null) {
    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
      this.grid[row][col] = element;
    }
  }

  clearGrid() {
    this.grid = [[null, null, null], [null, null, null], [null, null, null]];
  }

  findMatch(): SpellRecipe | null {
    for (const recipe of SPELL_RECIPES) {
      if (this.patternsMatch(this.grid, recipe.pattern)) {
        return recipe;
      }
    }
    return null;
  }

  learnSpell(recipe: SpellRecipe): LearnedSpell | null {
    // check if already learned
    if (this.learnedSpells.find(s => s.recipeId === recipe.id)) {
      notify('info', 'Already Known', `${recipe.icon} ${recipe.name}`);
      return null;
    }
    const spell: LearnedSpell = {
      id: `spell-${this.nextSpellId++}`,
      recipeId: recipe.id,
      name: recipe.name,
      icon: recipe.icon,
      element: recipe.element,
      damage: recipe.damage,
      manaCost: recipe.manaCost,
      cooldown: recipe.cooldown,
      projectileSpeed: recipe.projectileSpeed,
      projectileColor: recipe.projectileColor,
      effectType: recipe.effectType,
      hotkey: null,
      currentCooldown: 0,
    };
    this.learnedSpells.push(spell);
    notify('success', 'Spell Learned!', `${recipe.icon} ${recipe.name}`, recipe.icon);
    return spell;
  }

  assignHotkey(spellId: string, hotkey: number): boolean {
    if (hotkey < 1 || hotkey > 8) return false;
    // unassign if someone else has it
    this.learnedSpells.forEach(s => { if (s.hotkey === hotkey) s.hotkey = null; });
    const spell = this.learnedSpells.find(s => s.id === spellId);
    if (!spell) return false;
    spell.hotkey = hotkey;
    return true;
  }

  getSpellByHotkey(hotkey: number): LearnedSpell | null {
    return this.learnedSpells.find(s => s.hotkey === hotkey) || null;
  }

  tickCooldowns(deltaMs: number) {
    this.learnedSpells.forEach(s => {
      if (s.currentCooldown > 0) s.currentCooldown = Math.max(0, s.currentCooldown - deltaMs);
    });
  }

  castSpell(hotkey: number): LearnedSpell | null {
    const spell = this.getSpellByHotkey(hotkey);
    if (!spell || spell.currentCooldown > 0) return null;
    spell.currentCooldown = spell.cooldown;
    return spell;
  }

  private patternsMatch(a: (ElementType | null)[][], b: (string | null)[][]): boolean {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  serialize(): LearnedSpell[] {
    return this.learnedSpells.map(s => ({ ...s }));
  }

  load(data: LearnedSpell[]) {
    this.learnedSpells = data.map(s => ({ ...s }));
    const maxId = this.learnedSpells.reduce((mx, s) => {
      const num = parseInt(s.id.replace('spell-', ''), 10) || 0;
      return num > mx ? num : mx;
    }, 0);
    this.nextSpellId = maxId + 1;
  }
}
