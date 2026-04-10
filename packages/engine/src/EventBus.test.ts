import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from './EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('calls listener when event is emitted', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.emit('game:score', { points: 10 });
      expect(listener).toHaveBeenCalledWith({ points: 10 });
    });

    it('calls multiple listeners in order', () => {
      const order: number[] = [];
      bus.on('game:score', () => order.push(1));
      bus.on('game:score', () => order.push(2));
      bus.emit('game:score', { points: 5 });
      expect(order).toEqual([1, 2]);
    });

    it('does not call listener for different event', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.emit('entity:create', { entityId: 'e1', type: 'player' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('emits events with no payload', () => {
      const listener = vi.fn();
      bus.on('engine:start', listener);
      bus.emit('engine:start', {});
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('stops receiving events after unsubscribe', () => {
      const listener = vi.fn();
      const sub = bus.on('game:score', listener);
      bus.emit('game:score', { points: 1 });
      sub.unsubscribe();
      bus.emit('game:score', { points: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe method returns undefined', () => {
      const listener = vi.fn();
      const sub = bus.on('game:score', listener);
      expect(sub.unsubscribe()).toBeUndefined();
    });
  });

  describe('once', () => {
    it('calls listener only once', () => {
      const listener = vi.fn();
      bus.once('game:score', listener);
      bus.emit('game:score', { points: 10 });
      bus.emit('game:score', { points: 20 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('passes payload to listener', () => {
      const listener = vi.fn();
      bus.once('game:score', listener);
      bus.emit('game:score', { points: 5 });
      expect(listener).toHaveBeenCalledWith({ points: 5 });
    });

    it('does not call listener after unsubscribe', () => {
      const listener = vi.fn();
      const sub = bus.once('game:score', listener);
      bus.emit('game:score', { points: 5 });
      sub.unsubscribe();
      bus.emit('game:score', { points: 10 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('removes specific listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('game:score', listener1);
      bus.on('game:score', listener2);
      bus.off('game:score', listener1);
      bus.emit('game:score', { points: 10 });
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('removes all listeners when no callback provided', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('game:score', listener1);
      bus.on('game:score', listener2);
      bus.off('game:score');
      bus.emit('game:score', { points: 10 });
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('removes listeners for different event', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.off('entity:create', listener);
      bus.emit('game:score', { points: 10 });
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('emit with no listeners', () => {
    it('does not crash when no listeners registered', () => {
      expect(() => {
        bus.emit('game:score', { points: 10 });
      }).not.toThrow();
    });

    it('does not crash when event type not registered', () => {
      expect(() => {
        bus.emit('game:score', { points: 10 });
      }).not.toThrow();
    });
  });

  describe('event history', () => {
    it('records emitted events in reverse chronological order', () => {
      bus.on('game:score', vi.fn());
      bus.on('engine:start', vi.fn());
      bus.emit('game:score', { points: 10 });
      bus.emit('engine:start', {});
      const history = bus.history;
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ event: 'engine:start', payload: {}, timestamp: expect.any(Number) });
      expect(history[1]).toEqual({ event: 'game:score', payload: { points: 10 }, timestamp: expect.any(Number) });
    });

    it('maintains reversed chronological order', () => {
      bus.on('game:score', vi.fn());
      bus.emit('engine:start', {});
      bus.emit('game:score', { points: 5 });
      const history = bus.history;
      expect(history).toHaveLength(2);
      expect(history[0].event).toBe('game:score');
      expect(history[1].event).toBe('engine:start');
    });

    it('respects maxHistory limit', () => {
      const smallBus = new EventBus({ maxHistory: 1 });
      smallBus.on('game:score', vi.fn());
      smallBus.emit('game:score', { points: 10 });
      smallBus.emit('game:score', { points: 20 });
      const history = smallBus.history;
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({ event: 'game:score', payload: { points: 20 }, timestamp: expect.any(Number) });
    });
  });

  describe('clear', () => {
    it('removes all listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('game:score', listener1);
      bus.on('engine:start', listener2);
      bus.clear();
      bus.emit('game:score', { points: 10 });
      bus.emit('engine:start', {});
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('clears event history', () => {
      bus.on('game:score', vi.fn());
      bus.emit('game:score', { points: 10 });
      bus.clear();
      expect(bus.history).toHaveLength(0);
    });

    it('works when already empty', () => {
      expect(() => {
        bus.clear();
      }).not.toThrow();
    });
  });

  describe('listenerCount', () => {
    it('returns number of listeners for event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('game:score', listener1);
      bus.on('game:score', listener2);
      expect(bus.listenerCount('game:score')).toBe(2);
      expect(bus.listenerCount('engine:start')).toBe(0);
    });

    it('returns 0 for unknown event', () => {
      expect(bus.listenerCount('game:score')).toBe(0);
    });

    it('does not count once listeners', () => {
      const listener = vi.fn();
      bus.once('game:score', listener);
      expect(bus.listenerCount('game:score')).toBe(1);
    });
  });

  describe('totalListenerCount', () => {
    it('returns total number of listeners across all events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      bus.on('game:score', listener1);
      bus.on('game:score', listener2);
      bus.on('engine:start', listener3);
      expect(bus.totalListenerCount()).toBe(3);
    });

    it('returns 0 when no listeners', () => {
      expect(bus.totalListenerCount()).toBe(0);
    });

    it('does not count once listeners', () => {
      const listener = vi.fn();
      bus.once('game:score', listener);
      expect(bus.totalListenerCount()).toBe(1);
    });
  });

  describe('muted', () => {
    it('suppresses event emissions when muted', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.setMuted(true);
      bus.emit('game:score', { points: 10 });
      bus.setMuted(false);
      bus.emit('game:score', { points: 20 });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ points: 20 });
    });

    it('does not record history when muted', () => {
      bus.on('game:score', vi.fn());
      bus.setMuted(true);
      bus.emit('game:score', { points: 10 });
      bus.setMuted(false);
      bus.emit('game:score', { points: 20 });
      expect(bus.history).toHaveLength(1);
      expect(bus.history[0]).toEqual({ event: 'game:score', payload: { points: 20 }, timestamp: expect.any(Number) });
    });

    it('works with constructor parameter', () => {
      const mutedBus = new EventBus({ maxHistory: 10 });
      mutedBus.setMuted(true);
      mutedBus.on('game:score', vi.fn());
      mutedBus.emit('game:score', { points: 10 });
      expect(mutedBus.history).toHaveLength(0);
    });
  });

  describe('constructor options', () => {
    it('respects maxHistory option', () => {
      const limitedBus = new EventBus({ maxHistory: 2 });
      limitedBus.on('game:score', vi.fn());
      limitedBus.emit('game:score', { points: 10 });
      limitedBus.emit('game:score', { points: 20 });
      limitedBus.emit('game:score', { points: 30 });
      expect(limitedBus.history).toHaveLength(2);
    });

    it('uses default maxHistory when not provided', () => {
      const bus = new EventBus();
      expect(bus.getMaxHistory()).toBe(1000);
    });

    it('initializes with empty history', () => {
      const bus = new EventBus();
      expect(bus.history).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles undefined listeners gracefully', () => {
      expect(() => {
        bus.on('game:score', undefined as any);
      }).not.toThrow();
    });

    it('handles null listeners gracefully', () => {
      expect(() => {
        bus.on('game:score', null as any);
      }).not.toThrow();
    });

    it('works with custom events via cast', () => {
      const listener = vi.fn();
      bus.on('custom:my-event' as any, listener);
      bus.emit('custom:my-event' as any, { foo: 'bar' });
      expect(listener).toHaveBeenCalledWith({ foo: 'bar' });
    });
  });
});