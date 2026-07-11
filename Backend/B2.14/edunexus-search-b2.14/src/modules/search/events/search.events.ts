/**
 * search.events.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Event name constants + typed payloads published through the injected
 * IEventBus (extension point — see interfaces/infrastructure.interfaces.ts).
 * Other modules (Audit, Notifications, Analytics) can subscribe to these
 * without any direct coupling to the Search module.
 */

export const SEARCH_EXECUTED_EVENT = 'search.executed';
export const INDEX_DOCUMENT_UPSERTED_EVENT = 'search.index.upserted';
export const INDEX_DOCUMENT_DELETED_EVENT = 'search.index.deleted';
export const REINDEX_STARTED_EVENT = 'search.reindex.started';
export const REINDEX_COMPLETED_EVENT = 'search.reindex.completed';
export const REINDEX_FAILED_EVENT = 'search.reindex.failed';

export interface ISearchExecutedPayload {
  tenantId: string;
  userId: string;
  term: string;
  mode: string;
  resultCount: number;
  tookMs: number;
}

export interface IIndexDocumentUpsertedPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  module: string;
}

export interface IIndexDocumentDeletedPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
}

export interface IReindexLifecyclePayload {
  tenantId?: string;
  entityType?: string;
  indexed?: number;
  failed?: number;
  tookMs?: number;
  error?: string;
}
