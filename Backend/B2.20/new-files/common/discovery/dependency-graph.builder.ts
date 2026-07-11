import { Injectable } from '@nestjs/common';
import { DependencyGraph } from '../interfaces/module-registry.interface';

export interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: string[][];
}

/**
 * Pure graph algorithms over a DependencyGraph (produced by
 * ModuleDiscoveryService.buildDependencyGraph). Kept separate from
 * the discovery service so the cycle-detection logic is independently
 * unit-testable with a hand-built graph, no Nest DI container needed.
 */
@Injectable()
export class DependencyGraphBuilder {
  detectCycles(graph: DependencyGraph): CycleDetectionResult {
    const adjacency = new Map<string, string[]>();
    for (const node of graph.nodes) adjacency.set(node, []);
    for (const edge of graph.edges) {
      adjacency.get(edge.from)?.push(edge.to);
    }

    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];
    const cycles: string[][] = [];

    const visit = (node: string): void => {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      path.push(node);

      for (const neighbor of adjacency.get(node) ?? []) {
        visit(neighbor);
      }

      stack.delete(node);
      path.pop();
    };

    for (const node of graph.nodes) {
      if (!visited.has(node)) visit(node);
    }

    return { hasCycles: cycles.length > 0, cycles };
  }
}
