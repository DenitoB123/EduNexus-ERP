/**
 * csv.converter.ts
 *
 * Uses `csv-parse`/`csv-stringify` (added as new dependencies for this
 * milestone -- not previously in package.json). Generic over any row
 * shape via class-transformer, so a business module gets CSV import/export
 * for its DTO "for free" by passing its DTO class.
 */

import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from '../mappers/object.mapper';

@Injectable()
export class CsvConverter {
  /** Parses CSV text into an array of the given DTO class. First row is treated as the header. */
  import<T extends object>(csvText: string, dtoClass: ClassConstructor<T>): T[] {
    const rows: Record<string, string>[] = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return rows.map((row) => ObjectMapper.toInstance(dtoClass, row));
  }

  /** Serializes a list of plain objects/DTO instances to CSV text. `columns` controls column order; defaults to keys of the first row. */
  export<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T & string)[]): string {
    return stringify(rows, {
      header: true,
      columns: columns as string[] | undefined,
    });
  }
}
