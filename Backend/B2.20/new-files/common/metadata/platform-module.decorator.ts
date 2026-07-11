import 'reflect-metadata';
import { PLATFORM_MODULE_METADATA_KEY, PlatformModuleMetadata } from './module-metadata.interface';

/**
 * Optional. Attaches descriptive metadata to a Nest module class so
 * ModuleRegistryService can report a friendlier name/description than
 * the raw class name, and so future tooling (an admin UI, a CLI) can
 * list "installed modules" meaningfully. A module that skips this
 * decorator is still discovered by ModuleDiscoveryService — it just
 * falls back to the class name.
 *
 * Usage:
 *   @PlatformModule({ key: 'reporting', displayName: 'Enterprise Reporting' })
 *   @Module({ ... })
 *   export class ReportingModule {}
 */
export function PlatformModule(metadata: PlatformModuleMetadata): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(PLATFORM_MODULE_METADATA_KEY, metadata, target);
  };
}
