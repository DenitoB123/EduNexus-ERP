import { Injectable, Type } from '@nestjs/common';
import { LazyModuleLoader, ModuleRef } from '@nestjs/core';
import { AppLoggerService } from '../logger/app-logger.service';

export interface ProviderManifestEntry {
  token: string;
  description: string;
  moduleKey: string;
}

/**
 * NOTE: ordinary constructor-based dependency injection remains the
 * default and correct way to consume providers in this codebase. This
 * registry exists for the narrower cases that need it:
 *
 *  1. A human/tooling-facing manifest of "what common/infrastructure
 *     providers exist and what module owns them" (register()/list()),
 *     useful for onboarding and for the platform metadata endpoint.
 *  2. Genuinely dynamic resolution — e.g. a plugin system resolving a
 *     provider by a runtime-known token — via resolve()/loadModuleLazily(),
 *     thin wrappers over Nest's own ModuleRef/LazyModuleLoader.
 *
 * It is not a service locator for regular application code.
 */
@Injectable()
export class ProviderRegistryService {
  private readonly manifest = new Map<string, ProviderManifestEntry>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly lazyModuleLoader: LazyModuleLoader,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ProviderRegistryService');
  }

  register(entry: ProviderManifestEntry): void {
    if (this.manifest.has(entry.token)) {
      this.logger.warn(`Provider token "${entry.token}" is already registered in the manifest; overwriting`);
    }
    this.manifest.set(entry.token, entry);
  }

  list(): ProviderManifestEntry[] {
    return Array.from(this.manifest.values());
  }

  /** Resolves an already-instantiated provider from the current DI container by token/class. */
  resolve<T>(token: string | Type<T>): T {
    return this.moduleRef.get(token, { strict: false });
  }

  /** Loads a module (and its providers) on demand rather than at bootstrap — for optional/heavy feature modules. */
  async loadModuleLazily<T>(moduleLoader: () => Promise<Type<T>>): Promise<ModuleRef> {
    const moduleType = await moduleLoader();
    return this.lazyModuleLoader.load(() => moduleType);
  }
}
