/**
 * The mandatory enterprise base fields (schema.prisma's documented
 * convention), factored out once so every entity interface in this
 * module extends it instead of repeating the eleven fields by hand.
 */
export interface BaseCommEntity {
  id: string;
  tenantId: string;
  schoolGroupId: string | null;
  schoolId: string | null;
  campusId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
}
