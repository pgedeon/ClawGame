/**
 * Unit tests for the storage-only activation funnel log (onboarding §4).
 * All storage injected in-memory; no window dependency required.
 */
import { describe, it, expect } from 'vitest';
import {
  trackEvent,
  getEvents,
  clearEvents,
  exportEvents,
  getFunnelSnapshot,
  ACTIVATION_EVENTS_STORAGE_KEY,
  type ActivationEvent,
} from '../utils/activationEvents';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    _map: map,
  };
}

describe('activationEvents', () => {
  it('appends events with ISO timestamps and cleaned props', () => {
    const s = memoryStorage();
    trackEvent('ai_suggestion_shown', { projectId: 'p1', recipes: 'a,b', missing: undefined }, s);
    const events = getEvents(s);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('ai_suggestion_shown');
    expect(events[0].props).toEqual({ projectId: 'p1', recipes: 'a,b' });
    expect(() => new Date(events[0].ts).toISOString()).not.toThrow();
  });

  it('preserves insertion order (oldest first)', () => {
    const s = memoryStorage();
    trackEvent('landing_viewed', {}, s);
    trackEvent('preview_opened', { projectId: 'p1' }, s);
    expect(getEvents(s).map((e) => e.name)).toEqual(['landing_viewed', 'preview_opened']);
  });

  it('caps at 500 events dropping the oldest', () => {
    const s = memoryStorage();
    for (let i = 0; i < 600; i++) trackEvent('synthetic', { n: i }, s);
    const events = getEvents(s);
    expect(events).toHaveLength(500);
    expect(events[0].props?.n).toBe(100); // first 100 dropped
    expect(events[499].props?.n).toBe(599);
  });

  it('never throws when storage is unavailable', () => {
    const throwing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(() => trackEvent('edit_applied', {}, throwing)).not.toThrow();
    expect(getEvents(throwing)).toEqual([]);
    expect(getFunnelSnapshot(throwing).totalEvents).toBe(0);
  });

  it('clearEvents empties the log', () => {
    const s = memoryStorage();
    trackEvent('edit_applied', {}, s);
    clearEvents(s);
    expect(getEvents(s)).toEqual([]);
    expect(s._map.has(ACTIVATION_EVENTS_STORAGE_KEY)).toBe(false);
  });

  it('exportEvents returns pretty JSON containing only id/enum props', () => {
    const s = memoryStorage();
    trackEvent('edit_applied', { provider: 'mock', recipeId: 'topdown-add-pillar', path: 'main-scene.json' }, s);
    const exported = exportEvents(s);
    const parsed: ActivationEvent[] = JSON.parse(exported);
    expect(parsed[0].props?.recipeId).toBe('topdown-add-pillar');
  });

  it('funnel snapshot derives activation only from play_started with editsApplied >= 1', () => {
    const s = memoryStorage();
    trackEvent('play_started', { projectId: 'p1', editsApplied: 0 }, s);
    expect(getFunnelSnapshot(s).activated).toBe(false);
    trackEvent('edit_applied', { recipeId: 'r1' }, s);
    trackEvent('play_started', { projectId: 'p1', editsApplied: 1 }, s);
    const snap = getFunnelSnapshot(s);
    expect(snap.activated).toBe(true);
    expect(snap.totalEvents).toBe(3);
    expect(snap.counts['play_started']).toBe(2);
    expect(snap.firstSeenAt).toBeTruthy();
  });
});
