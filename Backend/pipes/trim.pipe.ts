import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Recursively trims leading/trailing whitespace from every string
 * value in a request body/query. Intended for use per-DTO via
 * @UsePipes(TrimPipe) rather than globally, since not every field
 * (e.g. passwords) should be silently trimmed.
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return this.trimDeep(value);
  }

  private trimDeep(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.trimDeep(item));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.trimDeep(val);
      }
      return result;
    }

    return value;
  }
}
