import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus';

describe('EventBus', () => {
  it('delivers typed event payloads to listeners', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on('game:score', listener);
    bus.emit('game:score', { points: 10 });

    expect(listener).toHaveBeenCalledWith({ points: 10 });
  });

  it('unsubscribes listeners via returned handles', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    const handle = bus.on('engine:start', listener);
    handle.unsubscribe();
    bus.emit('engine:start', {});

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports once listeners', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.once('game:score', listener);
    bus.emit('game:score', { points: 5 });
    bus.emit('game:score', { points: 15 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ points: 5 });
  });

  it('can remove specific listeners or whole event channels', () => {
    const bus = new EventBus();
    const first = vi.fn();
    const second = vi.fn();

    bus.on('game:score', first);
    bus.on('game:score', second);
    bus.off('game:score', first);
    bus.emit('game:score', { points: 1 });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    bus.off('game:score');
    bus.emit('game:score', { points: 2 });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('notifies wildcard listeners', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.onAny(listener);
    bus.emit('entity:create', { entityId: 'enemy-1', type: 'enemy' });

    expect(listener).toHaveBeenCalledWith('entity:create', { entityId: 'enemy-1', type: 'enemy' });
  });

  it('exposes active listeners and clears them', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on('game:score', listener);
    expect(bus.getListeners('game:score')).toHaveLength(1);

    bus.clearListeners('game:score');
    expect(bus.getListeners('game:score')).toHaveLength(0);

    bus.on('engine:start', listener);
    bus.onAny(() => undefined);
    bus.clearListeners();

    expect(bus.getListeners('engine:start')).toHaveLength(0);
  });

  it('destroys all listeners', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on('game:score', listener);
    bus.onAny(listener);
    bus.destroy();
    bus.emit('game:score', { points: 99 });

    expect(listener).not.toHaveBeenCalled();
  });
});
