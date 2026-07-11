import { SearchInput } from '../interfaces/base-model.interface';

export class SearchHelper {
  static buildWhere(search?: SearchInput, allowedFields?: string[]): Record<string, unknown> {
    if (!search || !search.query || search.fields.length === 0) return {};

    const fields = allowedFields
      ? search.fields.filter((f) => allowedFields.includes(f))
      : search.fields;

    if (fields.length === 0) return {};

    return {
      OR: fields.map((field) => ({
        [field]: { contains: search.query, mode: 'insensitive' },
      })),
    };
  }
}
