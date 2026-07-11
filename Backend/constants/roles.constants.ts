/**
 * Canonical system role names. This is a shared naming registry only
 * — no Users, Auth, or RBAC module exists yet (explicitly out of
 * scope through B1.6). Future modules should reference these
 * constants instead of hardcoding role strings, so the names stay
 * consistent platform-wide once RBAC is implemented.
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  CAMPUS_ADMIN: 'CAMPUS_ADMIN',
  STAFF: 'STAFF',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUARDIAN: 'GUARDIAN',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
