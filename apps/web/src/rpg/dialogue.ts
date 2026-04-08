/**
 * Dialogue System — manages dialogue trees, branching, and effects
 */
import { DialogueTree, DialogueLine, DialogueChoice } from './types';
import { notify } from './notifications';

export class DialogueManager {
  private trees: Map<string, DialogueTree> = new Map();
  private activeTree: DialogueTree | null = null;
  private currentLineId: string | null = null;
  private flags: Record<string, boolean> = {};

  registerTree(tree: DialogueTree) {
    this.trees.set(tree.id, tree);
  }

  get flags_() { return this.flags; }

  startDialogue(treeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) return false;
    this.activeTree = tree;
    this.currentLineId = tree.startLineId;
    return true;
  }

  isActive(): boolean {
    return this.activeTree !== null && this.currentLineId !== null;
  }

  getCurrentLine(): DialogueLine | null {
    if (!this.activeTree || !this.currentLineId) return null;
    return this.activeTree.lines[this.currentLineId] || null;
  }

  getChoices(): DialogueChoice[] {
    const line = this.getCurrentLine();
    if (!line?.choices) return [];
    // filter by conditions
    return line.choices.filter(c => {
      if (!c.condition) return true;
      return this.checkCondition(c.condition.type, c.condition.payload);
    });
  }

  advance(choiceIndex?: number): { ended: boolean; effect?: { type: string; payload: Record<string, any> } } {
    const line = this.getCurrentLine();
    if (!line) return { ended: true };

    // Apply line effect
    let effectResult: { type: string; payload: Record<string, any> } | undefined = undefined;
    if (line.effect) {
      effectResult = this.applyEffect(line.effect.type, line.effect.payload);
    }

    // If choices and user picked one
    if (line.choices && choiceIndex !== undefined) {
      const choices = this.getChoices();
      if (choices[choiceIndex]) {
        this.currentLineId = choices[choiceIndex].next;
        return { ended: false, effect: effectResult };
      }
    }

    // Auto advance
    if (line.next) {
      this.currentLineId = line.next;
      return { ended: false, effect: effectResult };
    }

    // No next = dialogue ends
    this.activeTree = null;
    this.currentLineId = null;
    return { ended: true, effect: effectResult };
  }

  endDialogue() {
    this.activeTree = null;
    this.currentLineId = null;
  }

  private checkCondition(type: string, payload: Record<string, any>): boolean {
    switch (type) {
      case 'flagSet': return !!this.flags[payload.flag];
      default: return true;
    }
  }

  private applyEffect(type: string, payload: Record<string, any>): { type: string; payload: Record<string, any> } {
    switch (type) {
      case 'setFlag':
        this.flags[payload.flag] = true;
        return { type: 'setFlag', payload };
      case 'startQuest':
        return { type: 'startQuest', payload };
      case 'giveItem':
        return { type: 'giveItem', payload };
      case 'heal':
        return { type: 'heal', payload };
      default:
        return { type, payload };
    }
  }

  serialize(): Record<string, boolean> {
    return { ...this.flags };
  }

  load(flags: Record<string, boolean>) {
    this.flags = { ...flags };
  }
}
