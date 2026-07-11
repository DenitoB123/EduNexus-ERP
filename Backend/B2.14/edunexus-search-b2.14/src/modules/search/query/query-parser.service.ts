/**
 * query-parser.service.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure — Query Layer
 *
 * Normalizes a raw SearchQueryDto into an engine-agnostic ISearchQuery.
 * Detects search mode from the term's own syntax when not explicitly
 * specified:
 *   - `"quoted text"`      -> phrase
 *   - `=exact text`        -> exact
 *   - `partial*` / `*text` -> partial
 *   - anything else        -> keyword
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { SearchQueryDto } from '../dto/search-query.dto';
import { ISearchQuery, SearchMode, ISearchSort, SortDirection } from '../interfaces/search-query.interface';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/search.constants';
import { FilterBuilderService } from './filter-builder.service';
import { ISearchRequestContext } from '../interfaces/infrastructure.interfaces';

const PHRASE_PATTERN = /^".*"$/;
const EXACT_PATTERN = /^=(.+)$/;
const PARTIAL_PATTERN = /[*]/;

@Injectable()
export class QueryParserService {
  constructor(private readonly filterBuilder: FilterBuilderService) {}

  parse(dto: SearchQueryDto, context: ISearchRequestContext): ISearchQuery {
    const rawTerm = (dto.q ?? '').trim();
    const { term, mode } = this.resolveTermAndMode(rawTerm, dto.mode);

    const filters = this.filterBuilder.build(dto.filter, context);
    const sort = this.parseSort(dto.sort);

    const page = dto.page && dto.page > 0 ? Math.floor(dto.page) : DEFAULT_PAGE;
    let pageSize = dto.pageSize && dto.pageSize > 0 ? Math.floor(dto.pageSize) : DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    return { term, mode, filters, sort, page, pageSize };
  }

  private resolveTermAndMode(rawTerm: string, explicitMode?: SearchMode): { term: string; mode: SearchMode } {
    if (explicitMode) {
      return { term: this.stripSyntax(rawTerm), mode: explicitMode };
    }
    if (PHRASE_PATTERN.test(rawTerm)) {
      return { term: rawTerm.slice(1, -1), mode: 'phrase' };
    }
    const exactMatch = EXACT_PATTERN.exec(rawTerm);
    if (exactMatch) {
      return { term: exactMatch[1], mode: 'exact' };
    }
    if (PARTIAL_PATTERN.test(rawTerm)) {
      return { term: rawTerm.replace(/\*/g, ''), mode: 'partial' };
    }
    return { term: rawTerm, mode: 'keyword' };
  }

  private stripSyntax(term: string): string {
    if (PHRASE_PATTERN.test(term)) return term.slice(1, -1);
    const exactMatch = EXACT_PATTERN.exec(term);
    if (exactMatch) return exactMatch[1];
    return term.replace(/\*/g, '');
  }

  private parseSort(sort?: string): ISearchSort[] {
    if (!sort) return [];
    return sort.split(',').map((clause) => {
      const [field, direction] = clause.split(':');
      if (!field) {
        throw new BadRequestException(`Invalid sort clause: "${clause}"`);
      }
      return { field, direction: (direction as SortDirection) ?? 'desc' };
    });
  }
}
