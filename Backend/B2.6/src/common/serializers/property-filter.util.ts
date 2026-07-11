/**
 * property-filter.util.ts
 *
 * Applies ISerializationOptions.exclude/include on top of an already-plain
 * object, AFTER class-transformer's own @Expose/@Exclude decorators have
 * run. This is for ad-hoc, call-site filtering (e.g. "exclude 'ssn' just
 * for this one response") without requiring a dedicated DTO class/group
 * for every field combination a caller might want.
 */

export function filterProperties<T extends Record<string, unknown>>(
  obj: T,
  options?: { exclude?: string[]; include?: string[] },
): Record<string, unknown> {
  if (!options?.exclude?.length && !options?.include?.length) return obj;

  let entries = Object.entries(obj);

  if (options.include?.length) {
    const includeSet = new Set(options.include);
    entries = entries.filter(([key]) => includeSet.has(key));
  }

  if (options.exclude?.length) {
    const excludeSet = new Set(options.exclude);
    entries = entries.filter(([key]) => !excludeSet.has(key));
  }

  return Object.fromEntries(entries);
}
