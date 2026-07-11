import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../auth/auth.constants';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
