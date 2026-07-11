import { Injectable } from '@nestjs/common';
import { GLOBAL_MODULE_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { AppLoggerService } from '../logger/app-logger.service';
import { PLATFORM_MODULE_METADATA_KEY, PlatformModuleMetadata } from '../metadata/module-metadata.interface';
import { RegisteredModuleInfo, DependencyGraph, ModuleDependencyEdge } from '../interfaces/module-registry.interface';

/**
 * Thin, defensive wrapper around @nestjs/core's ModulesContainer.
 * ModulesContainer is a semi-internal API (it's what @nestjs/terminus
 * and most discovery libraries build on), so every accessor here is
 * wrapped so a future Nest upgrade that reshapes it degrades to an
 * empty/partial result instead of crashing the platform module.
 */
@Injectable()
export class ModuleDiscoveryService {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ModuleDiscoveryService');
  }

  private safeModuleName(metatype: unknown): string {
    return (metatype as { name?: string })?.name ?? 'UnknownModule';
  }

  private readPlatformMetadata(metatype: unknown): PlatformModuleMetadata | undefined {
    try {
      return Reflect.getMetadata(PLATFORM_MODULE_METADATA_KEY, metatype as object) as
        | PlatformModuleMetadata
        | undefined;
    } catch {
      return undefined;
    }
  }

  listModules(): RegisteredModuleInfo[] {
    const results: RegisteredModuleInfo[] = [];

    for (const module of this.modulesContainer.values()) {
      try {
        const metatype = module.metatype;
        const name = this.safeModuleName(metatype);

        const importNames = Array.from(module.imports ?? [])
          .map((imported) => this.safeModuleName(imported.metatype))
          .filter((n) => n !== 'UnknownModule');

        let isGlobal = false;
        try {
          isGlobal = Boolean(Reflect.getMetadata(GLOBAL_MODULE_METADATA, metatype as object));
        } catch {
          isGlobal = false;
        }

        results.push({
          name,
          providerCount: module.providers?.size ?? 0,
          controllerCount: module.controllers?.size ?? 0,
          importNames,
          isGlobal,
        });
      } catch (error) {
        this.logger.warn(
          `Skipped a module during discovery due to an introspection error: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  getModule(name: string): RegisteredModuleInfo | undefined {
    return this.listModules().find((m) => m.name === name);
  }

  buildDependencyGraph(): DependencyGraph {
    const modules = this.listModules();
    const nodes = modules.map((m) => m.name);
    const edges: ModuleDependencyEdge[] = [];

    for (const module of modules) {
      for (const importName of module.importNames) {
        edges.push({ from: module.name, to: importName });
      }
    }

    return { nodes, edges };
  }
}
