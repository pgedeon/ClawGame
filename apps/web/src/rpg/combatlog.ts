/**
 * @clawgame/web - Combat Log
 * Scrollable history of combat events: spell casts, damage dealt/received, kills.
 */

export type CombatEntryType = 'spell' | 'damage-dealt' | 'damage-taken' | 'kill' | 'heal' | 'mana' | 'info';

export interface CombatLogEntry {
  id: string;
  type: CombatEntryType;
  text: string;
  timestamp: number;
  /** Stack count for repeated identical entries */
  count?: number;
}

const MAX_ENTRIES = 50;

export class CombatLogManager {
  private entries: CombatLogEntry[] = [];
  private idCounter = 0;

  /** Add a combat log entry. Collapses duplicates within 2s into a count. */
  log(type: CombatEntryType, text: string): void {
    const now = Date.now();
    const prev = this.entries[0];
    if (prev && prev.type === type && prev.text === text && now - prev.timestamp < 2000) {
      prev.count = (prev.count || 1) + 1;
      prev.timestamp = now;
    } else {
      this.entries.unshift({ id: `cl-${++this.idCounter}`, type, text, timestamp: now });
      if (this.entries.length > MAX_ENTRIES) this.entries.pop();
    }
  }

  spell(text: string)      { this.log('spell', text); }
  damageDealt(text: string) { this.log('damage-dealt', text); }
  damageTaken(text: string) { this.log('damage-taken', text); }
  kill(text: string)       { this.log('kill', text); }
  heal(text: string)       { this.log('heal', text); }
  mana(text: string)       { this.log('mana', text); }
  info(text: string)       { this.log('info', text); }

  getEntries(): CombatLogEntry[] { return this.entries; }
  clear(): void { this.entries = []; }
}

/** Color map for entry types — used by the panel renderer */
export const COMBAT_ENTRY_COLORS: Record<CombatEntryType, string> = {
  'spell':         '#fb923c',  // orange
  'damage-dealt':  '#86efac',  // green
  'damage-taken':  '#fca5a5',  // red
  'kill':          '#fef08a',  // yellow
  'heal':          '#6ee7b7',  // teal
  'mana':          '#93c5fd',  // blue
  'info':          '#c4b5fd',  // purple
};

/** Icon prefix per entry type */
export const COMBAT_ENTRY_ICONS: Record<CombatEntryType, string> = {
  'spell':         '✦',
  'damage-dealt':  '⚔',
  'damage-taken':  '◈',
  'kill':          '💀',
  'heal':          '✚',
  'mana':          '◆',
  'info':          '▸',
};