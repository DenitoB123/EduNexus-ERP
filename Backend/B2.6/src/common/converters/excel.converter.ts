/**
 * excel.converter.ts
 *
 * Uses `xlsx` (SheetJS, added as a new dependency for this milestone).
 * Reads/writes the first worksheet by default; a sheet name can be given
 * explicitly for multi-sheet workbooks.
 */

import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from '../mappers/object.mapper';

@Injectable()
export class ExcelConverter {
  import<T extends object>(fileBuffer: Buffer, dtoClass: ClassConstructor<T>, sheetName?: string): T[] {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const targetSheet = sheetName ?? workbook.SheetNames[0];
    const sheet = workbook.Sheets[targetSheet];
    if (!sheet) {
      throw new Error(`Sheet "${targetSheet}" not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    return rows.map((row) => ObjectMapper.toInstance(dtoClass, row));
  }

  export<T extends Record<string, unknown>>(rows: T[], sheetName = 'Sheet1'): Buffer {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
