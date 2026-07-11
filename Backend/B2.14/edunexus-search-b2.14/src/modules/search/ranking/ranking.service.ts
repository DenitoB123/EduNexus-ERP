/**
 * ranking.service.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure — Search Ranking
 *
 * Engine-agnostic relevance scoring, used by PrismaSearchEngine directly
 * (in-memory ranking over candidate rows) and available to any other
 * ISearchEngine implementation that wants consistent scoring behavior
 * instead of relying solely on the backend's native relevance (e.g. an
 * Elasticsearch adapter may blend its own `_score` with this service's
 * recency boost for a consistent cross-engine "feel").
 *
 * Supports:
 *   - Weighted fields (title/subtitle/keywords/searchableText, or a
 *     document's own ISearchDocument.fieldWeights override)
 *   - Exact match priority
 *   - Phrase match priority
 *   - Recent content boost (exponential decay by age)
 */

import { Injectable } from '@nestjs/common';
import { ISearchDocument } from '../interfaces/search-document.interface';
import { ISearchQuery } from '../interfaces/search-query.interface';
import { DEFAULT_FIELD_WEIGHTS, RANKING_BOOSTS } from '../constants/search.constants';

export interface IRankableDocument extends ISearchDocument {
  /** Precomputed base text-match score before ranking adjustments, if the caller already has one (e.g. from a native engine's own scoring). Defaults to a simple in-service term-frequency estimate when omitted. */
  baseScore?: number;
}

@Injectable()
export class RankingService {
  /** Computes a relevance score for a single document against a query. Higher is better. */
  score(document: IRankableDocument, query: ISearchQuery): number {
    if (!query.term) {
      return (document.boost ?? 1) * this.recencyBoost(document.updatedAt);
    }

    const term = query.term.trim();
    const termLower = term.toLowerCase();
    const weights = document.fieldWeights ?? DEFAULT_FIELD_WEIGHTS;

    let fieldScore = document.baseScore ?? 0;
    fieldScore += this.fieldMatchScore(document.title, termLower, weights.title ?? DEFAULT_FIELD_WEIGHTS.title, query);
    fieldScore += this.fieldMatchScore(
      document.subtitle,
      termLower,
      weights.subtitle ?? DEFAULT_FIELD_WEIGHTS.subtitle,
      query,
    );
    fieldScore += this.fieldMatchScore(
      (document.keywords ?? []).join(' '),
      termLower,
      weights.keywords ?? DEFAULT_FIELD_WEIGHTS.keywords,
      query,
    );
    fieldScore += this.fieldMatchScore(
      document.searchableText,
      termLower,
      weights.searchableText ?? DEFAULT_FIELD_WEIGHTS.searchableText,
      query,
    );

    const modeBoost = this.modeBoost(document, termLower, query);
    const recency = this.recencyBoost(document.updatedAt);
    const staticBoost = document.boost ?? 1;

    return fieldScore * modeBoost * staticBoost + recency;
  }

  /** Scores and sorts a candidate set, returning only the requested page. Used by engines (e.g. PrismaSearchEngine) that fetch a candidate pool and rank in-memory. */
  rankAndPaginate<T extends IRankableDocument>(
    candidates: T[],
    query: ISearchQuery,
  ): { items: (T & { score: number })[]; total: number } {
    const scored = candidates.map((doc) => ({ ...doc, score: this.score(doc, query) }));

    const sorted = this.applySort(scored, query);

    const start = (query.page - 1) * query.pageSize;
    const page = sorted.slice(start, start + query.pageSize);

    return { items: page, total: sorted.length };
  }

  private applySort<T extends { score: number; title: string; createdAt: Date; updatedAt: Date }>(
    items: T[],
    query: ISearchQuery,
  ): T[] {
    const sorts = query.sort.length > 0 ? query.sort : [{ field: 'relevance' as const, direction: 'desc' as const }];

    return [...items].sort((a, b) => {
      for (const sort of sorts) {
        const dir = sort.direction === 'asc' ? 1 : -1;
        let cmp = 0;
        switch (sort.field) {
          case 'relevance':
            cmp = a.score - b.score;
            break;
          case 'alphabetical':
            cmp = a.title.localeCompare(b.title);
            break;
          case 'createdAt':
            cmp = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updatedAt':
            cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          default:
            cmp = 0;
        }
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
  }

  private fieldMatchScore(fieldValue: string | undefined, termLower: string, weight: number, query: ISearchQuery): number {
    if (!fieldValue) return 0;
    const valueLower = fieldValue.toLowerCase();

    if (query.mode === 'exact') {
      return valueLower === termLower ? weight * 10 : 0;
    }
    if (!valueLower.includes(termLower)) {
      // Keyword mode: also credit partial token overlap so multi-word queries still score.
      if (query.mode === 'keyword') {
        const tokens = termLower.split(/\s+/).filter(Boolean);
        const hits = tokens.filter((t) => valueLower.includes(t)).length;
        return tokens.length > 0 ? weight * (hits / tokens.length) : 0;
      }
      return 0;
    }
    return weight;
  }

  private modeBoost(document: ISearchDocument, termLower: string, query: ISearchQuery): number {
    const title = document.title?.toLowerCase() ?? '';
    const text = document.searchableText?.toLowerCase() ?? '';

    if (title === termLower || text === termLower) {
      return RANKING_BOOSTS.exactMatch;
    }
    if (query.mode === 'phrase' && (title.includes(termLower) || text.includes(termLower))) {
      return RANKING_BOOSTS.phraseMatch;
    }
    return RANKING_BOOSTS.partialMatch;
  }

  private recencyBoost(updatedAt: Date): number {
    const ageDays = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const halfLife = RANKING_BOOSTS.recencyHalfLifeDays;
    const decay = Math.pow(0.5, ageDays / halfLife);
    return decay * RANKING_BOOSTS.recencyMaxBoost;
  }
}
