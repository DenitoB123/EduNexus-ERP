import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'edunexus:required-roles';
export const REQUIRED_PERMISSIONS_KEY = 'edunexus:required-permissions';

export const RequireRoles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

export const RequirePermissions = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
