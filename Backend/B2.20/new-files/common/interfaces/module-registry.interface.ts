export interface RegisteredModuleInfo {
  name: string;
  providerCount: number;
  controllerCount: number;
  importNames: string[];
  isGlobal: boolean;
}

export interface ModuleDependencyEdge {
  from: string;
  to: string;
}

export interface DependencyGraph {
  nodes: string[];
  edges: ModuleDependencyEdge[];
}

/**
 * Read-only view over everything currently registered in the Nest DI
 * container. Implemented by ModuleRegistryService (common/registry),
 * which is itself backed by ModuleDiscoveryService (common/discovery)
 * — this interface exists so consumers (e.g. the platform controller,
 * or a future admin/ops module) can depend on the contract without
 * depending on the discovery implementation directly.
 */
export interface IModuleRegistry {
  listModules(): RegisteredModuleInfo[];
  getModule(name: string): RegisteredModuleInfo | undefined;
  getDependencyGraph(): DependencyGraph;
}
