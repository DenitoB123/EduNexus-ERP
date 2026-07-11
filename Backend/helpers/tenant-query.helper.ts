export class TenantQueryHelper {
  /**
   * Merges tenant scoping into an arbitrary Prisma `where` clause.
   * Always wins over any tenantId the caller may have set, so a
   * tenant can never accidentally (or maliciously) query across
   * tenant boundaries.
   */
  static scopeWhere<W extends Record<string, unknown>>(
    where: W,
    tenantId: string,
  ): W & { tenantId: string } {
    return { ...where, tenantId };
  }

  static scopeBySchool<W extends Record<string, unknown>>(
    where: W,
    schoolId?: string,
  ): W {
    return schoolId ? { ...where, schoolId } : where;
  }

  static scopeByCampus<W extends Record<string, unknown>>(
    where: W,
    campusId?: string,
  ): W {
    return campusId ? { ...where, campusId } : where;
  }

  static excludeSoftDeleted<W extends Record<string, unknown>>(
    where: W,
    includeDeleted = false,
  ): W & { deletedAt?: null } {
    return includeDeleted ? where : { ...where, deletedAt: null };
  }
}
