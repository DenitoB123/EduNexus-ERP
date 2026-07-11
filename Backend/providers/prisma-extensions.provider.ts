import { Prisma } from '@prisma/client';
import { OptimisticLockException } from '../exceptions/database.exceptions';

/**
 * Applies optimistic-locking conventions to every future business
 * model that follows the mandatory base-field block (a `version`
 * column). When a caller passes the currently-known `version` inside
 * `data` on an `update()` call, this extension turns it into a guard
 * on `where.version` and auto-increments the stored value, raising
 * OptimisticLockException on a mismatch instead of silently
 * overwriting concurrent changes.
 *
 * Soft delete is intentionally NOT handled via a global query
 * override here — that pattern is too fragile across Prisma's typed
 * delete/update operations. Instead, BaseRepository (Phase 1.4)
 * issues an explicit `update()` setting `deletedAt`/`deletedBy`,
 * which this same locking logic still applies to.
 *
 * No business models exist yet (Phase 1.2); this extension is inert
 * until `update()` is called with a numeric `data.version`, so it
 * requires no per-model registration as new modules are added.
 */
export function createOptimisticLockingExtension() {
  return Prisma.defineExtension({
    name: 'edunexus-optimistic-locking',
    query: {
      $allModels: {
        async update({ args, query, model }) {
          const data = args.data as Record<string, unknown> & { version?: number };

          if (typeof data.version !== 'number') {
            return query(args);
          }

          const expectedVersion = data.version;
          const where = args.where as Record<string, unknown> & { version?: number };
          where.version = expectedVersion;
          data.version = { increment: 1 } as unknown as number;

          try {
            return await query(args);
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
              const id = (args.where as { id?: string }).id ?? 'unknown';
              throw new OptimisticLockException(model, id);
            }
            throw error;
          }
        },
      },
    },
  });
}
