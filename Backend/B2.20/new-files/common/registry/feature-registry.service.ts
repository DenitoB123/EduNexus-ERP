import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

export type FeatureKind = 'business-module' | 'plugin' | 'extension' | 'integration';

export interface FeatureDescriptor<TCapability = unknown> {
  kind: FeatureKind;
  key: string;
  displayName: string;
  version?: string;
  /** Arbitrary payload the registering module cares about, e.g. a set of hooks or a config object. Typed by the caller. */
  capability?: TCapability;
}

/**
 * A single generic registration surface for anything future modules
 * need to plug into the platform declaratively, instead of every
 * module inventing its own registry (as B2.12's ReportFactory /
 * DatasetRegistry did, ad hoc, before this existed). Feature-specific
 * registries are still fine to keep for their strongly-typed API —
 * they can register a summary entry here too, purely so the platform
 * has one place to answer "what's installed" across every kind of
 * extension point.
 *
 * This is intentionally NOT a replacement for Nest's module system —
 * modules are still composed via imports/DI as normal. This registry
 * is for cross-cutting *discovery* of what's been plugged in, and for
 * the narrow set of cases (plugins/extensions) that don't have their
 * own compile-time-known module graph.
 */
@Injectable()
export class FeatureRegistryService {
  private readonly features = new Map<string, FeatureDescriptor>();

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('FeatureRegistryService');
  }

  private compositeKey(kind: FeatureKind, key: string): string {
    return `${kind}:${key}`;
  }

  register<TCapability>(descriptor: FeatureDescriptor<TCapability>): void {
    const compositeKey = this.compositeKey(descriptor.kind, descriptor.key);
    if (this.features.has(compositeKey)) {
      this.logger.warn(`Feature "${compositeKey}" is already registered; overwriting`);
    }
    this.features.set(compositeKey, descriptor as FeatureDescriptor);
    this.logger.log(`Registered ${descriptor.kind} "${descriptor.key}" (${descriptor.displayName})`);
  }

  get<TCapability = unknown>(kind: FeatureKind, key: string): FeatureDescriptor<TCapability> {
    const found = this.features.get(this.compositeKey(kind, key));
    if (!found) {
      throw new ResourceNotFoundException('Feature', this.compositeKey(kind, key));
    }
    return found as FeatureDescriptor<TCapability>;
  }

  has(kind: FeatureKind, key: string): boolean {
    return this.features.has(this.compositeKey(kind, key));
  }

  list(kind?: FeatureKind): FeatureDescriptor[] {
    const all = Array.from(this.features.values());
    return kind ? all.filter((f) => f.kind === kind) : all;
  }
}
