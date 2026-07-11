import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { UuidUtil } from '../utils/uuid.util';

/**
 * Parses a comma-separated query param (e.g. "?ids=a,b,c") into a
 * string array and validates every entry is a UUID. Intended for
 * bulk-by-id endpoints.
 */
@Injectable()
export class ParseUuidArrayPipe implements PipeTransform<string, string[]> {
  transform(value: string): string[] {
    if (!value) return [];

    const ids = value.split(',').map((v) => v.trim()).filter(Boolean);
    const invalid = ids.filter((id) => !UuidUtil.isValid(id));

    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid UUID(s): ${invalid.join(', ')}`);
    }

    return ids;
  }
}
