/**
 * xml.converter.ts
 *
 * Uses `fast-xml-parser` (added as a new dependency for this milestone).
 * Assumes a flat `<records><record>...</record></records>`-style shape by
 * default; pass `recordTag` for a different root/record element name.
 */

import { Injectable } from '@nestjs/common';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from '../mappers/object.mapper';

@Injectable()
export class XmlConverter {
  import<T extends object>(xmlText: string, dtoClass: ClassConstructor<T>, recordTag = 'record'): T[] {
    const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
    const parsed = parser.parse(xmlText);
    const rootKey = Object.keys(parsed)[0];
    const container = parsed[rootKey];
    const recordsRaw = container?.[recordTag];
    const records: unknown[] = Array.isArray(recordsRaw) ? recordsRaw : recordsRaw ? [recordsRaw] : [];
    return records.map((row) => ObjectMapper.toInstance(dtoClass, row as object));
  }

  export<T extends Record<string, unknown>>(rows: T[], rootTag = 'records', recordTag = 'record'): string {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: true });
    return builder.build({ [rootTag]: { [recordTag]: rows } });
  }
}
