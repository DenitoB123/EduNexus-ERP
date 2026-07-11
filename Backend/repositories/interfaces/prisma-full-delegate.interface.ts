import { PrismaModelDelegate } from '../base/prisma-model-delegate.interface';

/**
 * Superset of the B1.4 PrismaModelDelegate adding the operations
 * B2.2's layered repository hierarchy needs (upsert, batch
 * create/update/delete, hard delete). Kept as a separate, additive
 * interface rather than modifying PrismaModelDelegate in place, so
 * the existing common/base/base.repository.ts (B1.4) and anything
 * built against its narrower delegate contract keeps compiling
 * unchanged.
 */
export interface PrismaFullModelDelegate<T> extends PrismaModelDelegate<T> {
  upsert(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<T>;

  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;

  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;

  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;

  delete(args: { where: Record<string, unknown> }): Promise<T>;
}
