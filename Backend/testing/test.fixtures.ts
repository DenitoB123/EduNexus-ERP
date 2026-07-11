import { randomUUID } from 'crypto';

export class TestFixtures {
  static tenantId = 'test-tenant-id';
  static correlationId = 'test-correlation-id';
  static actorId = 'test-actor-id';
  static schoolId = 'test-school-id';
  static campusId = 'test-campus-id';

  static baseEntity(overrides: Record<string, unknown> = {}) {
    return {
      id: randomUUID(),
      tenantId: this.tenantId,
      schoolId: this.schoolId,
      campusId: this.campusId,
      schoolGroupId: null,
      version: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      createdBy: this.actorId,
      updatedBy: this.actorId,
      deletedBy: null,
      ...overrides,
    };
  }

  static paginatedResult<T>(items: T[], total?: number) {
    const totalItems = total ?? items.length;
    return {
      items,
      meta: {
        page: 1,
        pageSize: 20,
        totalItems,
        totalPages: Math.ceil(totalItems / 20),
        hasNextPage: totalItems > 20,
        hasPreviousPage: false,
      },
    };
  }
}
