import { instanceToPlain, plainToInstance, ClassConstructor } from 'class-transformer';

export class Serializer {
  static serialize<T extends object>(instance: T): Record<string, unknown> {
    return instanceToPlain(instance) as Record<string, unknown>;
  }

  static deserialize<T extends object>(cls: ClassConstructor<T>, plain: Record<string, unknown>): T {
    return plainToInstance(cls, plain, { excludeExtraneousValues: true });
  }
}
