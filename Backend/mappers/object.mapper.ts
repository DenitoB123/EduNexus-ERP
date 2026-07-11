import { plainToInstance, instanceToPlain, ClassConstructor } from 'class-transformer';

export class ObjectMapper {
  static toInstance<T, V extends object>(cls: ClassConstructor<T>, plain: V): T {
    return plainToInstance(cls, plain, { excludeExtraneousValues: true });
  }

  static toPlain<T extends object>(instance: T): Record<string, unknown> {
    return instanceToPlain(instance) as Record<string, unknown>;
  }

  static toInstanceList<T, V extends object>(cls: ClassConstructor<T>, items: V[]): T[] {
    return items.map((item) => this.toInstance(cls, item));
  }
}
