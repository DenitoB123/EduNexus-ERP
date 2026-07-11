/**
 * json.converter.ts
 */

import { Injectable } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from '../mappers/object.mapper';

@Injectable()
export class JsonConverter {
  import<T extends object>(jsonText: string, dtoClass: ClassConstructor<T>): T[] {
    const parsed = JSON.parse(jsonText);
    const rows: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    return rows.map((row) => ObjectMapper.toInstance(dtoClass, row as object));
  }

  export<T>(rows: T[], pretty = false): string {
    return JSON.stringify(rows, null, pretty ? 2 : undefined);
  }
}
