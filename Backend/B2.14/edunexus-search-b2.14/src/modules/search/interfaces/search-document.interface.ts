/**
 * search-document.interface.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * ISearchDocument is the denormalized record stored in the centralized
 * `search_index` table. Every searchable entity across every EduNexus
 * module (Students, Admissions, Finance, HR, Library, ...) is projected
 * into this one shape by IndexBuilder before being written by
 * IndexingService — this is what makes cross-module global search
 * possible without the Search module knowing about business schemas.
 */

export interface ISearchDocumentFieldWeights {
  [fieldName: string]: number;
}

export interface ISearchDocument {
  /** Composite id: `${entityType}:${entityId}`. Unique per index row. */
  id: string;
  entityType: string;
  entityId: string;

  tenantId: string;
  campusId?: string;
  departmentId?: string;
  /** Owning business module, e.g. "students", "finance", "library". */
  module: string;
  status?: string;

  title: string;
  subtitle?: string;
  /** Concatenated, weighted searchable text used for full-text matching. */
  searchableText: string;
  /** Optional free-form keywords/tags contributing to matches. */
  keywords?: string[];

  /** Per-field weights used by RankingService (e.g. { title: 3, description: 1 }). */
  fieldWeights?: ISearchDocumentFieldWeights;
  /** Static boost multiplier for this document (e.g. pinned/featured content). */
  boost?: number;

  /** Small, display-ready summary of the original entity (id, name, avatar, route, etc.) — NOT the full entity. */
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
  indexedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Contract business-module entities implement (directly, or via a small
 * per-entity mapper) so IndexBuilder can project them into an
 * ISearchDocument. This is the ONLY coupling point between the Search
 * module and business modules.
 */
export interface IIndexableEntity {
  toSearchDocument(): Omit<ISearchDocument, 'id' | 'indexedAt'>;
}

/** Alternative to implementing IIndexableEntity on the entity class itself: a standalone mapper function, registered per entityType with IndexBuilder. */
export type SearchDocumentMapper<TEntity = unknown> = (entity: TEntity) => Omit<ISearchDocument, 'id' | 'indexedAt'>;
