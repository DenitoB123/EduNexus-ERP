/**
 * default-profiles.ts
 *
 * Placeholder profiles for the seven resource areas B2.6 calls out
 * (Authentication, Users, Roles, Permissions, Schools, Campuses,
 * Departments). PLACEHOLDER, not fully wired: no Prisma model, entity, or
 * DTO exists yet in the uploaded codebase for any of these (confirmed by
 * inspecting every uploaded milestone's schema.prisma before writing this
 * file -- none define User/Role/Permission/Tenant/School/Campus/
 * Department). Each profile below registers a transform against a small
 * local interface capturing the field shape implied by the architecture
 * doc and B1.2's RBAC description, so the *registration pattern* and
 * *naming convention* (`${resource}.entity-to-dto`, etc) are real and
 * ready to use -- only the field shapes are provisional.
 *
 * When the real entities land: replace each local interface below with
 * the real import, and the `transformationService.register(...)` calls
 * do not need to change at all.
 */

import { ITransformationService } from '../mappers/mapping.interfaces';
import { IMappingProfile } from './mapping-profile.interface';
import { ObjectMapper } from '../mappers/object.mapper';

// --- Provisional shapes (see file header) ---------------------------------

interface IUserEntityShape {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  roleIds: string[];
  isActive: boolean;
}
class UserResponseDto {
  id!: string;
  email!: string;
  fullName!: string;
  isActive!: boolean;
}

interface IRoleEntityShape {
  id: string;
  tenantId: string;
  name: string;
  permissionCodes: string[];
  isSystemRole: boolean;
}
class RoleResponseDto {
  id!: string;
  name!: string;
  permissionCodes!: string[];
}

interface IPermissionEntityShape {
  code: string;
  module: string;
  description: string;
}
class PermissionResponseDto {
  code!: string;
  module!: string;
  description!: string;
}

interface ISchoolEntityShape {
  id: string;
  tenantId: string;
  name: string;
  curriculum: string;
}
class SchoolResponseDto {
  id!: string;
  name!: string;
  curriculum!: string;
}

interface ICampusEntityShape {
  id: string;
  schoolId: string;
  name: string;
  isMainCampus: boolean;
}
class CampusResponseDto {
  id!: string;
  name!: string;
  isMainCampus!: boolean;
}

interface IDepartmentEntityShape {
  id: string;
  campusId: string;
  name: string;
  headStaffId?: string;
}
class DepartmentResponseDto {
  id!: string;
  name!: string;
}

interface IAuthSessionShape {
  userId: string;
  tenantId: string;
  issuedAt: string;
  expiresAt: string;
}
class AuthSessionResponseDto {
  userId!: string;
  issuedAt!: string;
  expiresAt!: string;
}

// --- Profiles ---------------------------------------------------------------

export const usersProfile: IMappingProfile = {
  name: 'users',
  register(transformationService: ITransformationService): void {
    transformationService.register<IUserEntityShape, UserResponseDto>('users.entity-to-dto', (entity) =>
      ObjectMapper.toInstance(UserResponseDto, entity),
    );
  },
};

export const rolesProfile: IMappingProfile = {
  name: 'roles',
  register(transformationService: ITransformationService): void {
    transformationService.register<IRoleEntityShape, RoleResponseDto>('roles.entity-to-dto', (entity) =>
      ObjectMapper.toInstance(RoleResponseDto, entity),
    );
  },
};

export const permissionsProfile: IMappingProfile = {
  name: 'permissions',
  register(transformationService: ITransformationService): void {
    transformationService.register<IPermissionEntityShape, PermissionResponseDto>('permissions.entity-to-dto', (entity) =>
      ObjectMapper.toInstance(PermissionResponseDto, entity),
    );
  },
};

export const schoolsProfile: IMappingProfile = {
  name: 'schools',
  register(transformationService: ITransformationService): void {
    transformationService.register<ISchoolEntityShape, SchoolResponseDto>('schools.entity-to-dto', (entity) =>
      ObjectMapper.toInstance(SchoolResponseDto, entity),
    );
  },
};

export const campusesProfile: IMappingProfile = {
  name: 'campuses',
  register(transformationService: ITransformationService): void {
    transformationService.register<ICampusEntityShape, CampusResponseDto>('campuses.entity-to-dto', (entity) =>
      ObjectMapper.toInstance(CampusResponseDto, entity),
    );
  },
};

export const departmentsProfile: IMappingProfile = {
  name: 'departments',
  register(transformationService: ITransformationService): void {
    transformationService.register<IDepartmentEntityShape, DepartmentResponseDto>('departments.entity-to-dto', (entity) =>
      ObjectMapper.toInstance(DepartmentResponseDto, entity),
    );
  },
};

export const authenticationProfile: IMappingProfile = {
  name: 'authentication',
  register(transformationService: ITransformationService): void {
    transformationService.register<IAuthSessionShape, AuthSessionResponseDto>('authentication.session-to-dto', (entity) =>
      ObjectMapper.toInstance(AuthSessionResponseDto, entity),
    );
  },
};

export const DEFAULT_PROFILES: IMappingProfile[] = [
  authenticationProfile,
  usersProfile,
  rolesProfile,
  permissionsProfile,
  schoolsProfile,
  campusesProfile,
  departmentsProfile,
];
