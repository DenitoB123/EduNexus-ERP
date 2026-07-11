/**
 * indexing.interface.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

import { ISearchDocument } from './search-document.interface';

export type IndexingJobType = 'index' | 'bulkIndex' | 'delete' | 'reindexEntityType' | 'reindexAll';

export interface IIndexingJobPayload {
  type: IndexingJobType;
  entityType?: string;
  document?: Omit<ISearchDocument, 'id' | 'indexedAt'>;
  documents?: Omit<ISearchDocument, 'id' | 'indexedAt'>[];
  entityId?: string;
  tenantId: string;
  requestedBy?: string;
  correlationId?: string;
}

export interface IIndexingResult {
  success: boolean;
  indexed: number;
  failed: number;
  errors: { entityId?: string; message: string }[];
  tookMs: number;
}

export interface IReindexOptions {
  entityType?: string;
  tenantId?: string;
  batchSize?: number;
  /** If true, runs synchronously and returns the full result; otherwise enqueues background jobs and returns immediately with a job reference. */
  background?: boolean;
}
