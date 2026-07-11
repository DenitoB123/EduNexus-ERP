/**
 * mapping-profile.interface.ts
 *
 * A "profile" is a named bundle of mapper/transform registrations for one
 * resource area (Users, Roles, Schools, ...). Business modules implement
 * this and register their profile with MappingProfileRegistry on module
 * init -- they do NOT write mapping logic from scratch, per the B2.6
 * requirement. Profiles are deliberately generic: at this milestone, no
 * concrete User/Role/Permission/School Prisma models or entities exist
 * yet in the uploaded codebase (verified before writing this file), so
 * the profiles below register against small locally-declared shape
 * interfaces as placeholders. When B1.2's real entities/DTOs land, swap
 * the placeholder interfaces for the real imports -- the registration
 * pattern itself does not change.
 */

import { ITransformationService } from '../mappers/mapping.interfaces';

export interface IMappingProfile {
  /** Unique profile name, e.g. 'users', 'roles', 'schools'. */
  readonly name: string;
  /** Registers this profile's transforms into the shared TransformationService. */
  register(transformationService: ITransformationService): void;
}
