/**
 * property-discovery.util.ts
 *
 * Reflection-based property/metadata discovery, with results cached per
 * constructor (a class's own property names/design-type metadata never
 * change at runtime, so repeated discovery for the same class in a hot
 * mapping loop is pure waste without caching).
 */

import 'reflect-metadata';
import { ClassConstructor } from 'class-transformer';
import { MemoCache } from './mapping-cache.util';

const propertyNamesCache = new MemoCache<ClassConstructor<unknown>, string[]>();
const designTypeCache = new MemoCache<string, unknown>();

export class PropertyDiscoveryUtil {
  /** Own enumerable instance property names of a class, discovered from a throwaway instance. Cached per class. */
  static getPropertyNames<T>(cls: ClassConstructor<T>): string[] {
    return propertyNamesCache.getOrCompute(cls as ClassConstructor<unknown>, () => {
      try {
        const instance = new cls();
        return Object.getOwnPropertyNames(instance as object);
      } catch {
        return [];
      }
    });
  }

  /** design:type metadata (set by TypeScript when emitDecoratorMetadata is on) for a given class property. Cached per class+property. */
  static getDesignType(target: object, propertyKey: string): unknown {
    const cacheKey = `${target.constructor.name}.${propertyKey}`;
    return designTypeCache.getOrCompute(cacheKey, () => Reflect.getMetadata('design:type', target, propertyKey));
  }

  /** Null/undefined handling helper: returns fallback for null/undefined, otherwise the value itself. */
  static withDefault<T>(value: T | null | undefined, fallback: T): T {
    return value === null || value === undefined ? fallback : value;
  }
}
