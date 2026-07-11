/**
 * Canonical permission action names, following a `resource:action`
 * naming convention (e.g. "students:create"). This file only defines
 * the action vocabulary and a builder helper — no Permissions module
 * or enforcement exists yet; that arrives with the Users/RBAC
 * milestone. Future modules should build permission strings through
 * `buildPermission()` rather than hand-writing strings, to keep the
 * naming convention consistent.
 */
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  EXPORT: 'export',
  MANAGE: 'manage',
} as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

export function buildPermission(resource: string, action: PermissionAction): string {
  return `${resource}:${action}`;
}
