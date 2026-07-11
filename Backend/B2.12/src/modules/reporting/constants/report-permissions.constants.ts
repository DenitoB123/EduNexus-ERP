/**
 * Permission strings evaluated by the existing PermissionsGuard /
 * @RequirePermissions() decorator (common/guards, common/decorators).
 *
 * These are inert until a future Auth/Users module populates
 * `request.authContext.permissions` — see common/decorators/current-user.decorator.ts.
 * PermissionsGuard already handles that gap by logging and allowing
 * requests through, so declaring these now is safe and forward-compatible.
 */
export const REPORT_PERMISSIONS = {
  GENERATE: 'reporting:report:generate',
  VIEW_EXECUTION: 'reporting:execution:view',
  DOWNLOAD: 'reporting:execution:download',
  TEMPLATE_MANAGE: 'reporting:template:manage',
  TEMPLATE_VIEW: 'reporting:template:view',
  SCHEDULE_MANAGE: 'reporting:schedule:manage',
  SCHEDULE_VIEW: 'reporting:schedule:view',
  DATASET_VIEW: 'reporting:dataset:view',
} as const;

export type ReportPermission = (typeof REPORT_PERMISSIONS)[keyof typeof REPORT_PERMISSIONS];
