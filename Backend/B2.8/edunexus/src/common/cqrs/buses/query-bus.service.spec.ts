import { QueryBus } from './query-bus.service';
import { QueryHandlerRegistry } from './query-handler.registry';
import { QueryCachingBehavior } from '../pipelines/query-caching.behavior';
import { BaseQuery } from '../queries/base.query';
import { IQueryHandler } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';

class TestQuery extends BaseQuery {
  constructor(public readonly filter: string) {
    super();
  }
}

const context: ICqrsExecutionContext = { correlationId: 'corr-1', tenantId: 'tenant-1' };

describe('QueryBus', () => {
  let registry: QueryHandlerRegistry;
  let cachingBehavior: { wrapExecute: jest.Mock };
  let bus: QueryBus;

  beforeEach(() => {
    registry = new QueryHandlerRegistry();
    cachingBehavior = {
      wrapExecute: jest.fn((query, ctx, handler) => handler.execute(query, ctx)),
    };
    bus = new QueryBus(registry, cachingBehavior as unknown as QueryCachingBehavior, []);
  });

  it('dispatches to the registered handler via the caching behavior', async () => {
    const handler: IQueryHandler<TestQuery, string[]> = {
      execute: jest.fn().mockResolvedValue(['a', 'b']),
    };
    bus.register(TestQuery, handler);

    const result = await bus.execute(new TestQuery('active'), context);

    expect(result).toEqual(['a', 'b']);
    expect(cachingBehavior.wrapExecute).toHaveBeenCalledWith(expect.any(TestQuery), context, handler);
  });

  it('throws when no handler is registered for the query', async () => {
    await expect(bus.execute(new TestQuery('active'), context)).rejects.toThrow(
      /No QueryHandler registered for "TestQuery"/,
    );
  });
});
