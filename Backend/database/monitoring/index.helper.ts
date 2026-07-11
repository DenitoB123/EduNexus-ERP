/**
 * Static helper documenting the mandatory indexes every future
 * tenant-scoped model must define in schema.prisma. Used by the
 * seed/test infrastructure to sanity-check schema conventions; does
 * not run any DDL itself (Prisma migrations own DDL).
 */
export class IndexHelper {
  static readonly MANDATORY_INDEXES: readonly string[] = ['tenantId', 'deletedAt'];

  static buildRecommendedIndexBlock(extra: string[] = []): string {
    const fields = [...this.MANDATORY_INDEXES, ...extra];
    return fields.map((field) => `@@index([${field}])`).join('\n');
  }
}
