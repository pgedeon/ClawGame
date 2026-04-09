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
      bus.emit('engine:start');
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
  });

  describe('once', () => {
    it('auto-unsubscribes after first call', () => {
      const listener = vi.fn();
      bus.once('game:score', listener);
      bus.emit('game:score', { points: 10 });
      bus.emit('game:score', { points: 20 });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ points: 10 });
    });

    it('works for events without payload', () => {
      const listener = vi.fn();
      bus.once('engine:stop', listener);
      bus.emit('engine:stop');
      bus.emit('engine:stop');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAny (wildcard)', () => {
    it('receives all events', () => {
      const listener = vi.fn();
      bus.onAny(listener);
      bus.emit('game:score', { points: 5 });
      bus.emit('engine:start');
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith('game:score', { points: 5 });
    });

    it('wildcard can be unsubscribed', () => {
      const listener = vi.fn();
      const sub = bus.onAny(listener);
      bus.emit('engine:start');
      sub.unsubscribe();
      bus.emit('engine:start');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('clears listeners for a specific event', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.clear('game:score');
      bus.emit('game:score', { points: 5 });
      expect(listener).not.toHaveBeenCalled();
    });

    it('clears all listeners when called without args', () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      const wc = vi.fn();
      bus.on('game:score', l1);
      bus.on('engine:start', l2);
      bus.onAny(wc);
      bus.clear();
      bus.emit('game:score', { points: 5 });
      bus.emit('engine:start');
      expect(l1).not.toHaveBeenCalled();
      expect(l2).not.toHaveBeenCalled();
      expect(wc).not.toHaveBeenCalled();
    });
  });

  describe('history', () => {
    it('records emitted events', () => {
      bus.emit('game:score', { points: 10 });
      bus.emit('engine:start');
      const history = bus.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].event).toBe('engine:start');
      expect(history[1].event).toBe('game:score');
    });

    it('respects limit parameter', () => {
      bus.emit('game:score', { points: 1 });
      bus.emit('game:score', { points: 2 });
      const history = bus.getHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].payload).toEqual({ points: 2 });
    });

    it('caps history at maxHistory', () => {
      const smallBus = new EventBus({ maxHistory: 3 });
      for (let i = 0; i < 5; i++) {
        smallBus.emit('game:score', { points: i });
      }
      expect(smallBus.getHistory()).toHaveLength(3);
    });
  });

  describe('muted', () => {
    it('does not emit when muted', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.setMuted(true);
      bus.emit('game:score', { points: 10 });
      expect(listener).not.toHaveBeenCalled();
    });

    it('resumes emitting when unmuted', () => {
      const listener = vi.fn();
      bus.on('game:score', listener);
      bus.setMuted(true);
      bus.emit('game:score', { points: 10 });
      bus.setMuted(false);
      bus.emit('game:score', { points: 20 });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ points: 20 });
    });
  });

  describe('listenerCount', () => {
    it('returns correct count', () => {
      bus.on('game:score', vi.fn());
      bus.on('game:score', vi.fn());
      bus.on('engine:start', vi.fn());
      expect(bus.listenerCount('game:score')).toBe(2);
      expect(bus.listenerCount('engine:start')).toBe(1);
      expect(bus.listenerCount('entity:create')).toBe(0);
    });
  });

  describe('totalListenerCount', () => {
    it('includes wildcard listeners', () => {
      bus.on('game:score', vi.fn());
      bus.onAny(vi.fn());
      expect(bus.totalListenerCount()).toBe(2);
    });
  });

  describe('error isolation', () => {
    it('continues to other listeners after one throws', () => {
      const good = vi.fn();
      bus.on('game:score', () => { throw new Error('boom'); });
      bus.on('game:score', good);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      bus.emit('game:score', { points: 5 });
      errorSpy.mockRestore();
      expect(good).toHaveBeenCalled();
    });
  });

  describe('custom events', () => {
    it('supports custom: prefixed events', () => {
      const listener = vi.fn();
      bus.on('custom:my-event' as any, listener);
      bus.emit('custom:my-event' as any, { foo: 'bar' });
      expect(listener).toHaveBeenCalledWith({ foo: 'bar' });
    });
  });
});
