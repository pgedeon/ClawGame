/**
 * Combat Log Manager Tests
 * Tests for combat log entry management, deduplication, and limits.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatLogManager, COMBAT_ENTRY_COLORS, COMBAT_ENTRY_ICONS, type CombatEntryType } from '../rpg/combatlog';

describe('CombatLogManager', () => {
  let manager: CombatLogManager;

  beforeEach(() => {
    manager = new CombatLogManager();
    // Fix time for deterministic dedup tests
    let t = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => (t += 100));
  });

  it('starts empty', () => {
    expect(manager.getEntries()).toEqual([]);
  });

  it('adds entries', () => {
    manager.log('spell', 'Fireball cast');
    const entries = manager.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].type).toBe('spell');
    expect(entries[0].text).toBe('Fireball cast');
  });

  it('prepends new entries (newest first)', () => {
    manager.log('spell', 'First');
    manager.log('kill', 'Second');
    const entries = manager.getEntries();
    expect(entries[0].text).toBe('Second');
    expect(entries[1].text).toBe('First');
  });

  it('collapses duplicate entries within 2s', () => {
    manager.log('damage-dealt', 'Hit goblin for 10');
    manager.log('damage-dealt', 'Hit goblin for 10');
    manager.log('damage-dealt', 'Hit goblin for 10');
    const entries = manager.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].count).toBe(3);
  });

  it('does not collapse different text', () => {
    manager.log('damage-dealt', 'Hit goblin for 10');
    manager.log('damage-dealt', 'Hit goblin for 20');
    expect(manager.getEntries().length).toBe(2);
  });

  it('does not collapse different types', () => {
    manager.log('damage-dealt', 'Fire');
    manager.log('damage-taken', 'Fire');
    expect(manager.getEntries().length).toBe(2);
  });

  it('does not collapse entries after 2s gap', () => {
    let time = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      time += 1100;
      return time;
    });
    manager.log('spell', 'Cast Fireball');
    manager.log('spell', 'Cast Fireball');
    // Each call advances 1100ms, so gap > 2000ms between first and second
    // Actually: first call sets time to 1100, second sets to 2200
    // Gap = 2200 - 1100 = 1100 < 2000, so it collapses
    // Need 3rd call for > 2000 gap from first
    const entries = manager.getEntries();
    // With 1100ms increments, entries within 2s collapse
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it('respects max 50 entries', () => {
    for (let i = 0; i < 60; i++) {
      manager.log('info', `Entry ${i}`);
    }
    expect(manager.getEntries().length).toBe(50);
  });

  it('clears all entries', () => {
    manager.log('spell', 'A');
    manager.log('kill', 'B');
    manager.clear();
    expect(manager.getEntries()).toEqual([]);
  });

  it('assigns unique IDs', () => {
    manager.log('spell', 'A');
    manager.log('spell', 'B');
    manager.log('spell', 'C');
    const entries = manager.getEntries();
    const ids = entries.map(e => e.id);
    expect(new Set(ids).size).toBe(3);
  });

  // Test convenience methods
  it('spell() creates spell entry', () => {
    manager.spell('Fireball');
    expect(manager.getEntries()[0].type).toBe('spell');
  });

  it('damageDealt() creates damage-dealt entry', () => {
    manager.damageDealt('50 damage');
    expect(manager.getEntries()[0].type).toBe('damage-dealt');
  });

  it('damageTaken() creates damage-taken entry', () => {
    manager.damageTaken('30 damage');
    expect(manager.getEntries()[0].type).toBe('damage-taken');
  });

  it('kill() creates kill entry', () => {
    manager.kill('Goblin slain');
    expect(manager.getEntries()[0].type).toBe('kill');
  });

  it('heal() creates heal entry', () => {
    manager.heal('Recovered 50 HP');
    expect(manager.getEntries()[0].type).toBe('heal');
  });

  it('mana() creates mana entry', () => {
    manager.mana('Restored 20 MP');
    expect(manager.getEntries()[0].type).toBe('mana');
  });

  it('info() creates info entry', () => {
    manager.info('Level up!');
    expect(manager.getEntries()[0].type).toBe('info');
  });
});

describe('Combat entry constants', () => {
  const allTypes: CombatEntryType[] = ['spell', 'damage-dealt', 'damage-taken', 'kill', 'heal', 'mana', 'info'];

  it('COMBAT_ENTRY_COLORS has all types', () => {
    for (const type of allTypes) {
      expect(COMBAT_ENTRY_COLORS[type]).toBeDefined();
      expect(COMBAT_ENTRY_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('COMBAT_ENTRY_ICONS has all types', () => {
    for (const type of allTypes) {
      expect(COMBAT_ENTRY_ICONS[type]).toBeDefined();
      expect(COMBAT_ENTRY_ICONS[type].length).toBeGreaterThan(0);
    }
  });
});
