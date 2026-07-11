// Barrel export for the B2.8 CQRS infrastructure. Business modules
// (B3+) should generally only need imports from here plus their own
// command/query/handler classes.

export * from './interfaces/cqrs-context.interface';
export * from './interfaces/command.interface';
export * from './interfaces/query.interface';
export * from './interfaces/pipeline.interface';
export * from './interfaces/projection.interface';
export * from './interfaces/extension-points.interface';

export * from './commands/base.command';
export * from './commands/tenant.command';
export * from './commands/authenticated.command';
export * from './commands/transactional.command';
export * from './commands/bulk.command';

export * from './queries/base.query';
export * from './queries/tenant.query';
export * from './queries/paginated.query';
export * from './queries/search.query';
export * from './queries/filter.query';
export * from './queries/report.query';

export * from './decorators/command-handler.decorator';
export * from './decorators/query-handler.decorator';
export * from './decorators/require-cqrs-access.decorator';

export * from './handlers/command-handler.base';
export * from './handlers/query-handler.base';

export * from './buses/command-bus.service';
export * from './buses/query-bus.service';

export * from './projections/projection-handler.base';
export * from './projections/projection-idempotency.guard';
export * from './read-models/read-model.base';

export * from './utils/cqrs-context.factory';
export * from './utils/cqrs-transaction-context.service';
export * from './utils/correlation-id.util';

export * from './cqrs.module';
