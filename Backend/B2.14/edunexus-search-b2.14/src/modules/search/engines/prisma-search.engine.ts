/**
 * prisma-search.engine.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Default ISearchEngine implementation, requiring nothing beyond the
 * PostgreSQL + Prisma foundation already assumed to exist (B1.1–B2.2). It
 * queries the denormalized `search_index` table (via the injected
 * IPrismaClientLike extension point — NOT arbitrary business tables) and
 * ranks candidates in-memory using RankingService.
 *
 * This engine is intentionally simple and dependency-free so every
 * EduNexus deployment gets working search out of the box. For large
 * datasets or advanced relevance needs, swap SEARCH_ENGINE to
 * ElasticSearchAdapter (../engines/elastic.adapter.ts) — no business
 * module changes required, since both implement ISearchEngine.
 *
 * Production note: for very large `search_index` tables, the candidate
 * fetch below can be replaced with a native Postgres `tsvector`/`tsquery`
 * query via `prisma.$queryRawUnsafe(...)` for better performance while
 * keeping the same ISearchEngine contract — the interface doesn't care how
 * candidates are found, only that ranked results come back.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { ISearchEngine } from './search-engine.interface';
import { ISearchDocument } from '../interfaces/search-document.interface';
import { ISearchQuery, ISearchResult, ISuggestion } from '../interfaces/search-query.interface';
import { ISearchRequestContext, IPrismaClientLike } from '../interfaces/infrastructure.interfaces';
import { PRISMA_SERVICE } from '../constants/tokens';
import { RankingService, IRankableDocument } from '../ranking/ranking.service';
import { DEFAULT_SUGGESTION_LIMIT } from '../constants/search.constants';

const CANDIDATE_POOL_CAP = 1000;

@Injectable()
export class PrismaSearchEngine implements ISearchEngine {
  readonly name = 'prisma';

  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: IPrismaClientLike,
    private readonly ranking: RankingService,
  ) {}

  async index(document: ISearchDocument): Promise<void> {
    await this.prisma.searchIndex.upsert({
      where: { id: document.id },
      create: this.toRow(document),
      update: this.toRow(document),
    });
  }

  async bulkIndex(
    documents: ISearchDocument[],
  ): Promise<{ indexed: number; failed: number; errors: { entityId: string; message: string }[] }> {
    let indexed = 0;
    const errors: { entityId: string; message: string }[] = [];

    for (const doc of documents) {
      try {
        await this.index(doc);
        indexed++;
      } catch (error) {
        errors.push({ entityId: doc.entityId, message: error instanceof Error ? error.message : String(error) });
      }
    }

    return { indexed, failed: errors.length, errors };
  }

  async remove(entityType: string, entityId: string, tenantId: string): Promise<void> {
    await this.prisma.searchIndex.deleteMany({
      where: { entityType, entityId, tenantId },
    });
  }

  async removeMany(entityType: string, tenantId: string): Promise<{ removed: number }> {
    const result = await this.prisma.searchIndex.deleteMany({ where: { entityType, tenantId } });
    return { removed: result.count };
  }

  async search(
    query: ISearchQuery,
    context: ISearchRequestContext,
    visibilityFilter?: Record<string, unknown>,
  ): Promise<ISearchResult> {
    const start = Date.now();
    const where = this.buildWhere(query, context, visibilityFilter);

    const candidateTake = Math.min(CANDIDATE_POOL_CAP, Math.max(query.page * query.pageSize * 5, 200));
    const rows = (await this.prisma.searchIndex.findMany({
      where,
      take: candidateTake,
    })) as unknown as IRankableDocument[];

    const { items, total } = this.ranking.rankAndPaginate(rows, query);

    return {
      items: items.map((doc) => ({
        id: doc.id,
        entityType: doc.entityType,
        entityId: doc.entityId,
        module: doc.module,
        title: doc.title,
        subtitle: doc.subtitle,
        score: doc.score,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      tookMs: Date.now() - start,
      query: { term: query.term, mode: query.mode },
    };
  }

  async suggest(prefix: string, context: ISearchRequestContext, entityType?: string, limit = DEFAULT_SUGGESTION_LIMIT): Promise<ISuggestion[]> {
    const where: Record<string, unknown> = {
      tenantId: context.tenant.tenantId,
      deletedAt: null,
      title: { startsWith: prefix, mode: 'insensitive' },
      ...(entityType ? { entityType } : {}),
    };

    const rows = (await this.prisma.searchIndex.findMany({ where, take: limit })) as unknown as ISearchDocument[];
    return rows.map((row) => ({ text: row.title, entityType: row.entityType }));
  }

  async count(tenantId: string, entityType?: string): Promise<number> {
    return this.prisma.searchIndex.count({
      where: { tenantId, deletedAt: null, ...(entityType ? { entityType } : {}) },
    });
  }

  // -----------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------

  private toRow(document: ISearchDocument): Record<string, unknown> {
    return { ...document };
  }

  private buildWhere(
    query: ISearchQuery,
    context: ISearchRequestContext,
    visibilityFilter?: Record<string, unknown>,
  ): Record<string, unknown> {
    const { filters } = query;
    const where: Record<string, unknown> = {
      deletedAt: null,
      tenantId: filters.tenantId ?? context.tenant.tenantId,
    };

    if (filters.campusId) where.campusId = filters.campusId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.module) where.module = this.toInClause(filters.module);
    if (filters.status) where.status = this.toInClause(filters.status);
    if (filters.entityType) where.entityType = this.toInClause(filters.entityType);

    if (filters.dateRange) {
      const range: Record<string, unknown> = {};
      if (filters.dateRange.range.from) range.gte = new Date(filters.dateRange.range.from);
      if (filters.dateRange.range.to) range.lte = new Date(filters.dateRange.range.to);
      where[filters.dateRange.field] = range;
    }

    if (filters.custom) {
      Object.assign(where, filters.custom);
    }

    if (visibilityFilter) {
      Object.assign(where, visibilityFilter);
    }

    if (query.term) {
      where.OR = this.buildTermClause(query);
    }

    return where;
  }

  private buildTermClause(query: ISearchQuery): Record<string, unknown>[] {
    const term = query.term;
    const insensitive = { mode: 'insensitive' as const };

    switch (query.mode) {
      case 'exact':
        return [{ title: { equals: term, ...insensitive } }, { keywords: { has: term } }];
      case 'phrase':
        return [{ title: { contains: term, ...insensitive } }, { searchableText: { contains: term, ...insensitive } }];
      case 'partial':
        return [{ title: { contains: term, ...insensitive } }, { searchableText: { contains: term, ...insensitive } }];
      case 'keyword':
      default: {
        const tokens = term.split(/\s+/).filter(Boolean);
        return tokens.flatMap((token) => [
          { title: { contains: token, ...insensitive } },
          { searchableText: { contains: token, ...insensitive } },
          { keywords: { has: token } },
        ]);
      }
    }
  }

  private toInClause(value: string | string[]): Record<string, unknown> | string {
    return Array.isArray(value) ? { in: value } : value;
  }
}
