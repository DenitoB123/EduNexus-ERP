import { Injectable } from '@nestjs/common';
import { ModuleDiscoveryService } from '../discovery/module-discovery.service';
import { DependencyGraphBuilder } from '../discovery/dependency-graph.builder';
import { IModuleRegistry, RegisteredModuleInfo, DependencyGraph } from '../interfaces/module-registry.interface';

/**
 * The IModuleRegistry contract's concrete implementation. Deliberately
 * a thin facade: all real introspection lives in ModuleDiscoveryService
 * (kept separate so discovery — the part that pokes at Nest internals —
 * can evolve independently of the stable public registry contract
 * other services depend on).
 */
@Injectable()
export class ModuleRegistryService implements IModuleRegistry {
  constructor(
    private readonly discovery: ModuleDiscoveryService,
    private readonly graphBuilder: DependencyGraphBuilder,
  ) {}

  listModules(): RegisteredModuleInfo[] {
    return this.discovery.listModules();
  }

  getModule(name: string): RegisteredModuleInfo | undefined {
    return this.discovery.getModule(name);
  }

  getDependencyGraph(): DependencyGraph {
    return this.discovery.buildDependencyGraph();
  }

  checkForCircularDependencies() {
    return this.graphBuilder.detectCycles(this.getDependencyGraph());
  }
}
