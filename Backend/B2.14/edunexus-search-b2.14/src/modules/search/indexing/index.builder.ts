/**
 * index.builder.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Converts a business entity into a full ISearchDocument, either via the
 * entity implementing IIndexableEntity itself, or via a mapper function
 * registered per entityType (for entities business modules don't want to
 * modify directly). This is the ONLY place entity-specific shape knowledge
 * enters the Search module — IndexingService/ISearchEngine never see raw
 * business entities, only the documents this class produces.
 */

import { Injectable } from '@nestjs/common';
import { ISearchDocument, IIndexableEntity, SearchDocumentMapper } from '../interfaces/search-document.interface';
import { DEFAULT_FIELD_WEIGHTS } from '../constants/search.constants';

function isIndexableEntity(entity: unknown): entity is IIndexableEntity {
  return typeof entity === 'object' && entity !== null && typeof (entity as IIndexableEntity).toSearchDocument === 'function';
}

@Injectable()
export class IndexBuilder {
  private readonly mappers = new Map<string, SearchDocumentMapper>();

  /** Registers a mapper function for entities that don't implement IIndexableEntity directly. Call once per entityType, typically from the owning business module's onModuleInit. */
  registerMapper<TEntity>(entityType: string, mapper: SearchDocumentMapper<TEntity>): void {
    this.mappers.set(entityType, mapper as SearchDocumentMapper);
  }

  /** Builds a full ISearchDocument (with computed id + indexedAt) from an entity that implements IIndexableEntity. */
  buildFromEntity(entity: unknown): ISearchDocument {
    if (!isIndexableEntity(entity)) {
      throw new Error(
        'IndexBuilder.buildFromEntity() requires an entity implementing IIndexableEntity. ' +
          'Use buildFromType(entityType, entity) for entities using a registered mapper instead.',
      );
    }
    return this.finalize(entity.toSearchDocument());
  }

  /** Builds a full ISearchDocument using the mapper registered for entityType. */
  buildFromType<TEntity>(entityType: string, entity: TEntity): ISearchDocument {
    const mapper = this.mappers.get(entityType);
    if (!mapper) {
      throw new Error(
        `No search document mapper registered for entityType "${entityType}". Call IndexBuilder.registerMapper() first, or implement IIndexableEntity on the entity.`,
      );
    }
    return this.finalize(mapper(entity));
  }

  /** Builds directly from an already-assembled partial document (used by the manual/admin indexing API). */
  buildFromPartial(partial: Omit<ISearchDocument, 'id' | 'indexedAt'>): ISearchDocument {
    return this.finalize(partial);
  }

  private finalize(partial: Omit<ISearchDocument, 'id' | 'indexedAt'>): ISearchDocument {
    if (!partial.entityType || !partial.entityId) {
      throw new Error('Search document must include entityType and entityId.');
    }
    return {
      ...partial,
      id: `${partial.entityType}:${partial.entityId}`,
      fieldWeights: partial.fieldWeights ?? DEFAULT_FIELD_WEIGHTS,
      boost: partial.boost ?? 1,
      searchableText: partial.searchableText ?? this.deriveSearchableText(partial),
      indexedAt: new Date(),
    };
  }

  private deriveSearchableText(partial: Omit<ISearchDocument, 'id' | 'indexedAt'>): string {
    return [partial.title, partial.subtitle, ...(partial.keywords ?? [])].filter(Boolean).join(' ');
  }
}
