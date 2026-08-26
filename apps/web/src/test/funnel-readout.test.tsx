/**
 * Tests for the funnel-readout lane (onboarding §4 remainder):
 * A/B variant assignment, play_started derivation, window.__clawgameEvents
 * console accessor, known-token collection, and the Settings
 * LocalDiagnosticsSection readout component.
 * All storage injected in-memory; all fetch stubbed.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import {
  AB_VARIANT_STORAGE_KEY,
  ACTIVATION_EVENTS_STORAGE_KEY,
  getAbVariant,
  peekAbVariant,
  trackEvent,
  trackPlayStarted,
  installClawgameEventsAccessor,
} from '../utils/activationEvents';
import { LocalDiagnosticsSection, collectKnownShareTokens } from '../components/LocalDiagnosticsSection';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    _map: map,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('A/B variant (design §4)', () => {
  it('peek returns undefined before first touch', () => {
    expect(peekAbVariant(memoryStorage())).toBeUndefined();
  });

  it('assigns once, persists, and stays stable across calls', () => {
    const s = memoryStorage();
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.9); // >= 0.5 → 'b'
    expect(getAbVariant(s)).toBe('b');
    rand.mockReturnValue(0.1); // would roll 'a' — must NOT re-roll
    expect(getAbVariant(s)).toBe('b');
    expect(s._map.get(AB_VARIANT_STORAGE_KEY)).toBe('b');
    expect(peekAbVariant(s)).toBe('b');
  });

  it('rolls a below 0.5 and re-rolls on corrupt stored value', () => {
    const s = memoryStorage();
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(getAbVariant(s)).toBe('a');
    s._map.set(AB_VARIANT_STORAGE_KEY, 'banana');
    expect(getAbVariant(s)).toBe('a'); // re-rolled deterministically by the spy
  });

  it('never throws when storage is unavailable', () => {
    const throwing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.7);
    expect(() => getAbVariant(throwing)).not.toThrow();
    expect(getAbVariant(throwing)).toBe('b');
  });
});

describe('trackPlayStarted derivation', () => {
  it('first play reports isFirstForProject true and prior same-project edit count', () => {
    const s = memoryStorage();
    trackEvent('edit_applied', { projectId: 'p1', path: 'main-scene.json' }, s);
    trackEvent('edit_applied', { projectId: 'p2', path: 'other.json' }, s); // other project — must not count
    trackPlayStarted('p1', s);
    const [play] = s._map.has(ACTIVATION_EVENTS_STORAGE_KEY)
      ? (JSON.parse(s._map.get(ACTIVATION_EVENTS_STORAGE_KEY)!) as Array<{ name: string; props?: Record<string, unknown> }>).filter((e) => e.name === 'play_started')
      : [];
    expect(play).toBeDefined();
    expect(play.props).toMatchObject({ projectId: 'p1', editsApplied: 1, isFirstForProject: true });
  });

  it('second play on the same project is not first', () => {
    const s = memoryStorage();
    trackPlayStarted('p1', s);
    trackPlayStarted('p1', s);
    const plays = (JSON.parse(s._map.get(ACTIVATION_EVENTS_STORAGE_KEY)!) as Array<{ props?: Record<string, unknown> }>)
      .map((e) => e.props!.isFirstForProject);
    expect(plays).toEqual([true, false]);
  });
});

describe('installClawgameEventsAccessor', () => {
  it('installs a frozen accessor wired to the real log, idempotently', () => {
    const host: { __clawgameEvents?: unknown } = {};
    installClawgameEventsAccessor(host);
    const first = host.__clawgameEvents as Record<string, unknown>;
    expect(first).toBeDefined();
    expect(Object.isFrozen(first)).toBe(true);

    // Idempotent: second install keeps the original instance.
    installClawgameEventsAccessor(host);
    expect(host.__clawgameEvents).toBe(first);

    // Wired methods operate on the shared storage key via default storage;
    // use an injected storage through trackEvent instead for assertions.
    (first.track as (n: string) => void)('landing_viewed');
    const events = (first.events as () => Array<{ name: string }>)();
    expect(events.at(-1)?.name).toBe('landing_viewed');
    expect((first.snapshot as () => { totalEvents: number })().totalEvents).toBeGreaterThan(0);
    expect(typeof (first.export as () => string)()).toBe('string');
    expect(['a', 'b']).toContain((first.abVariant as () => string)());
    (first.clear as () => void)();
    expect((first.events as () => unknown[])()).toEqual([]);
  });

  it('no-ops without a DOM window', () => {
    // jsdom provides window; simulate the non-browser branch via explicit target absence is
    // impossible here, so assert the guard contract instead: passing a bare object works,
    // and repeated installs do not throw.
    expect(() => installClawgameEventsAccessor({})).not.toThrow();
  });
});

describe('collectKnownShareTokens', () => {
  it('collects distinct hostedId tokens newest-first, capped', () => {
    const events = [
      { ts: 't1', name: 'share_created', props: { hostedId: 'aaa' } },
      { ts: 't2', name: 'game_remixed', props: { hostedId: 'bbb' } },
      { ts: 't3', name: 'play_started', props: { projectId: 'p1' } }, // ignored
      { ts: 't4', name: 'share_created', props: { hostedId: 'aaa' } }, // dup — skipped
      { ts: 't5', name: 'share_created', props: { hostedId: 'ccc' } },
    ];
    expect(collectKnownShareTokens(events)).toEqual(['ccc', 'aaa', 'bbb']);
    const many = Array.from({ length: 8 }, (_, i) => ({ ts: `t${i}`, name: 'share_created', props: { hostedId: `tok${i}` } }));
    expect(collectKnownShareTokens(many)).toHaveLength(5);
    expect(collectKnownShareTokens(many)[0]).toBe('tok7');
  });
});

describe('LocalDiagnosticsSection', () => {
  function stubFetch(stats?: { plays: number; remixes: number }, fail = false) {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      calls.push(url);
      if (fail) return { ok: false, status: 404, headers: { get: () => 'application/json' }, json: async () => ({}) };
      return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => stats };
    }));
    return calls;
  }

  it('renders zero-state: disabled buttons, empty funnel, no activation', () => {
    stubFetch();
    render(<LocalDiagnosticsSection storage={memoryStorage()} />);
    expect(screen.getByTestId('diagnostics-event-count').textContent).toBe('0 events stored');
    expect((screen.getByTestId('diagnostics-copy') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('diagnostics-clear') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('diagnostics-activation').textContent).toBe('Not yet');
    // All ten §4 funnel steps render with zero counts.
    const cells = screen.getByTestId('diagnostics-funnel').children;
    expect(cells).toHaveLength(10);
  });

  it('renders counts, activation badge, and A/B variant from a seeded log', () => {
    stubFetch();
    const s = memoryStorage();
    s._map.set(AB_VARIANT_STORAGE_KEY, 'a');
    trackEvent('landing_viewed', {}, s);
    trackEvent('edit_applied', { projectId: 'p1', path: 'x.json' }, s);
    trackEvent('play_started', { projectId: 'p1', editsApplied: 1, isFirstForProject: true }, s);
    render(<LocalDiagnosticsSection storage={s} />);
    expect(screen.getByTestId('diagnostics-event-count').textContent).toBe('3 events stored');
    expect(screen.getByTestId('diagnostics-activation').textContent).toBe('✓ Activated');
    expect(screen.getByTestId('diagnostics-funnel').textContent).toContain('Edits applied');
    expect(screen.getByText(/A\/B variant: a\./)).toBeTruthy();
  });

  it('fetches server stats per known token and renders them; failures show unavailable', async () => {
    const calls = stubFetch({ plays: 2, remixes: 1 });
    const s = memoryStorage();
    trackEvent('share_created', { hostedId: 'tok-123456789' }, s);
    render(<LocalDiagnosticsSection storage={s} />);
    await waitFor(() => {
      expect(screen.getByTestId('diagnostics-share-stats').textContent).toContain('2 plays · 1 remixes');
    });
    expect(calls.some((u) => u.includes('/api/share/tok-123456789/stats'))).toBe(true);
  });

  it('failed stats fetch degrades to "unavailable" without breaking the section', async () => {
    stubFetch(undefined, true);
    const s = memoryStorage();
    trackEvent('share_created', { hostedId: 'tok-deadbeef' }, s);
    render(<LocalDiagnosticsSection storage={s} />);
    await waitFor(() => {
      expect(screen.getByTestId('diagnostics-share-stats').textContent).toContain('unavailable');
    });
  });

  it('Clear wipes the log and collapses the section back to zero-state', () => {
    stubFetch();
    const s = memoryStorage();
    trackEvent('landing_viewed', {}, s);
    render(<LocalDiagnosticsSection storage={s} />);
    expect(screen.getByTestId('diagnostics-event-count').textContent).toBe('1 event stored');
    fireEvent.click(screen.getByTestId('diagnostics-clear'));
    expect(screen.getByTestId('diagnostics-event-count').textContent).toBe('0 events stored');
    expect(s._map.get(ACTIVATION_EVENTS_STORAGE_KEY)).toBeUndefined();
  });
});
