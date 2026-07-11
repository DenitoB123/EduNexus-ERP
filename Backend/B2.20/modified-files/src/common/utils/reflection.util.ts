import { Constructor } from '../types/common.types';

export class ReflectionUtil {
  static getClassName(instance: object): string {
    return instance.constructor.name;
  }

  static getMethodNames(target: Constructor): string[] {
    return Object.getOwnPropertyNames(target.prototype).filter(
      (name) => name !== 'constructor' && typeof target.prototype[name] === 'function',
    );
  }

  static getMetadata<T>(key: string, target: object, propertyKey?: string | symbol): T | undefined {
    return propertyKey
      ? (Reflect.getMetadata(key, target, propertyKey) as T | undefined)
      : (Reflect.getMetadata(key, target) as T | undefined);
  }

  // --- B2.20 additions — see IMPLEMENTATION_SUMMARY_B2_20.md §4 "Files Modified". ---
  // Used by common/discovery and common/metadata to support module/feature
  // discovery. Additive only; nothing above this line changed.

  static hasMetadata(key: string, target: object, propertyKey?: string | symbol): boolean {
    return propertyKey ? Reflect.hasMetadata(key, target, propertyKey) : Reflect.hasMetadata(key, target);
  }

  static getAllMetadataKeys(target: object, propertyKey?: string | symbol): (string | symbol)[] {
    return propertyKey
      ? ((Reflect.getMetadataKeys(target, propertyKey) as (string | symbol)[]) ?? [])
      : ((Reflect.getMetadataKeys(target) as (string | symbol)[]) ?? []);
  }

  /** Constructor parameter design types, as emitted by `emitDecoratorMetadata` (tsconfig already enables this). */
  static getConstructorParamTypes(target: Constructor): unknown[] {
    return (Reflect.getMetadata('design:paramtypes', target) as unknown[]) ?? [];
  }
}
