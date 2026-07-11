import { EventBus } from './event-bus.service';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';
import { EventMiddlewareChain } from './event.middleware';
import { DomainEvent } from './event.base';
import { TenantContextService } from '../../database/context/tenant-context.service';

class TestEvent extends DomainEvent {
  constructor(public readonly value: string) {
    super('test.event');
  }
}

describe('EventBus', () => {
  let registry: EventRegistry;
  let dispatcher: EventDispatcher;
  let bus: EventBus;
  let tenantContext: TenantContextService;
  let loggerMock: {
    setContext: jest.Mock;
    debug: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    log: jest.Mock;
  };

  beforeEach(() => {
    loggerMock = {
      setContext: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };
    registry = new EventRegistry();
    const middlewareChain = new EventMiddlewareChain(loggerMock as unknown as never);
    dispatcher = new EventDispatcher(registry, middlewareChain, loggerMock as unknown as never);
    tenantContext = new TenantContextService();
    bus = new EventBus(dispatcher, registry, tenantContext);
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

  it('swallows handler errors without throwing, after retrying', async () => {
    jest.useFakeTimers();

    bus.subscribe('test.event', { handle: jest.fn().mockRejectedValue(new Error('boom')) });
    const emitPromise = bus.emit(new TestEvent('x'));

    await jest.runAllTimersAsync();
    await expect(emitPromise).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalled();

    jest.useRealTimers();
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

  it('stamps tenant/actor/correlation context from TenantContextService when the event omits them', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('test.event', { handle });

    await tenantContext.run(
      { tenantId: 'tenant-1', actorId: 'actor-1', correlationId: 'corr-1' },
      async () => {
        await bus.emit(new TestEvent('x'));
      },
    );

    const dispatchedEvent = handle.mock.calls[0][0] as TestEvent;
    expect(dispatchedEvent.tenantId).toBe('tenant-1');
    expect(dispatchedEvent.actorId).toBe('actor-1');
    expect(dispatchedEvent.correlationId).toBe('corr-1');
  });
});
