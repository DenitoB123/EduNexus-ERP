import { EventBus } from './event-bus.service';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';
import { EventMiddlewareChain } from './event.middleware';
import { DomainEvent } from './event.base';

class TestEvent extends DomainEvent {
  constructor(public readonly value: string) {
    super('test.event');
  }
}

describe('EventBus', () => {
  let registry: EventRegistry;
  let dispatcher: EventDispatcher;
  let bus: EventBus;
  let loggerMock: { setContext: jest.Mock; debug: jest.Mock; error: jest.Mock; log: jest.Mock };

  beforeEach(() => {
    loggerMock = { setContext: jest.fn(), debug: jest.fn(), error: jest.fn(), log: jest.fn() };
    registry = new EventRegistry();
    const middlewareChain = new EventMiddlewareChain(loggerMock as unknown as never);
    dispatcher = new EventDispatcher(registry, middlewareChain, loggerMock as unknown as never);
    bus = new EventBus(dispatcher, registry);
  });

  it('invokes subscribed handler when matching event is emitted', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('test.event', { handle });

    const event = new TestEvent('hello');
    await bus.emit(event);

    expect(handle).toHaveBeenCalledWith(event);
  });

  it('does nothing when no handlers are registered', async () => {
    await expect(bus.emit(new TestEvent('x'))).resolves.toBeUndefined();
  });

  it('swallows handler errors without throwing', async () => {
    bus.subscribe('test.event', { handle: jest.fn().mockRejectedValue(new Error('boom')) });
    await expect(bus.emit(new TestEvent('x'))).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('invokes multiple handlers for the same event', async () => {
    const handleA = jest.fn().mockResolvedValue(undefined);
    const handleB = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('test.event', { handle: handleA });
    bus.subscribe('test.event', { handle: handleB });

    await bus.emit(new TestEvent('x'));

    expect(handleA).toHaveBeenCalled();
    expect(handleB).toHaveBeenCalled();
  });
});
