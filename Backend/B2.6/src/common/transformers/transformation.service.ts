/**
 * transformation.service.ts
 *
 * Concrete `ITransformationService`: a named registry of transform
 * functions (Create DTO -> Domain, Domain -> Response DTO, Prisma Model
 * -> Entity, etc), so callers invoke `transform('student.create-to-domain',
 * dto)` instead of importing and wiring individual mapper classes at every
 * call site. Business modules register their own transforms in their
 * module's constructor/onModuleInit; this service just owns the registry
 * and dispatch.
 *
 * This complements, not replaces, BaseMapper/DomainMapper: those are for
 * the common Entity<->DTO and Domain<->DTO cases; this is for arbitrary
 * named pipelines, including ones that don't fit a single mapper pair
 * (e.g. "Prisma Model -> Entity" per the B2.6 spec's transformation list).
 */

import { Injectable } from '@nestjs/common';
import { ITransformationService } from '../mappers/mapping.interfaces';

type AnyTransform = (input: unknown) => unknown;

@Injectable()
export class TransformationService implements ITransformationService {
  private readonly registry = new Map<string, AnyTransform>();

  register<TInput, TOutput>(name: string, transform: (input: TInput) => TOutput): void {
    if (this.registry.has(name)) {
      throw new Error(`Transformation "${name}" is already registered. Use a distinct name per pipeline.`);
    }
    this.registry.set(name, transform as AnyTransform);
  }

  transform<TInput, TOutput>(name: string, input: TInput): TOutput {
    const fn = this.registry.get(name);
    if (!fn) {
      throw new Error(`No transformation registered under "${name}". Register it in your module's provider setup first.`);
    }
    return fn(input) as TOutput;
  }

  transformBatch<TInput, TOutput>(name: string, inputs: TInput[]): TOutput[] {
    return inputs.map((input) => this.transform<TInput, TOutput>(name, input));
  }

  isRegistered(name: string): boolean {
    return this.registry.has(name);
  }
}
