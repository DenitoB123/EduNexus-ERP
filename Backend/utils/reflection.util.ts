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
}
