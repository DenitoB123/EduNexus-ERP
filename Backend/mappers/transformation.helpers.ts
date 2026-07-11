export class TransformationHelpers {
  static stripNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
    return result;
  }

  static renameKeys<T extends Record<string, unknown>>(obj: T, mapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[mapping[key] ?? key] = value;
    }
    return result;
  }
}
