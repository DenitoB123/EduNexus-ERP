import { PaginatedResult } from '../../database/interfaces/base-model.interface';

/**
 * B2.17 — Enterprise Reporting, Export & Document Generation Framework.
 *
 * B2.12 (Enterprise Reporting & Export Infrastructure) already built
 * working, tested concrete classes for every one of these roles
 * (`ReportingService`, `ReportQueryBuilder`, `ScheduledReportService`)
 * but did not extract named interfaces for them — `IReportExporter`
 * was the only one B2.12 formalized (`interfaces/exporter.interface.ts`),
 * because exporters are genuinely swapped via DI (`REPORT_EXPORTERS`
 * token). The other three are single-implementation today, so B2.17
 * adds the interfaces here (matching those classes' real, existing
 * method signatures exactly) and each class now declares
 * `implements I...` — a one-line additive change, not a rewrite —
 * so a future second implementation (e.g. a different builder for a
 * different query backend) has a contract to satisfy without
 * touching call sites.
 *
 * Generic type parameters intentionally use `unknown`/loose shapes
 * where the concrete class's own DTOs live in
 * `modules/reporting/dto/*` — importing those here would invert the
 * dependency (common/ depending on modules/), so this file only
 * captures the shape, not the exact DTO classes.
 */

export interface IReportService<TGenerateDto = unknown, TExecution = unknown, TQuery = unknown> {
  generateReport(scope: unknown, actorId: string | undefined, reportKey: string, dto: TGenerateDto): Promise<{ execution: TExecution; downloadUrl?: string }>;
  getExecution(id: string, tenantId: string): Promise<TExecution>;
  listExecutions(tenantId: string, query: TQuery): Promise<PaginatedResult<TExecution>>;
  getDownloadUrl(id: string, tenantId: string, actorId?: string): Promise<string>;
}

export interface IReportBuilder<TContext = unknown> {
  withTenantScope(scope: unknown): this;
  withParameters(parameters: Record<string, unknown>): this;
  withFilters(filters?: unknown[]): this;
  withSort(sort?: unknown[]): this;
  withGroupBy(groupBy?: string[]): this;
  withAggregations(aggregations?: unknown[]): this;
  withPagination(page?: number, pageSize?: number): this;
  build(): TContext;
}

export interface IReportScheduler<TSchedule = unknown, TCreateDto = unknown, TUpdateDto = unknown> {
  create(tenantId: string, actorId: string | undefined, dto: TCreateDto): Promise<TSchedule>;
  update(id: string, tenantId: string, actorId: string | undefined, dto: TUpdateDto): Promise<TSchedule>;
  remove(id: string, tenantId: string, actorId?: string): Promise<void>;
  findById(id: string, tenantId: string): Promise<TSchedule | null>;
  list(tenantId: string, page?: number, pageSize?: number): Promise<PaginatedResult<TSchedule>>;
  /** Manually triggers the schedule immediately, outside its normal cron cadence. */
  runNow(id: string, tenantId: string): Promise<string>;
}
