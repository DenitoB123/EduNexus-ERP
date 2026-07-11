/**
 * entity-diff.util.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Shallow field-by-field diff between a previous and next entity
 * snapshot. Deliberately shallow (not deep-diffing nested objects field
 * by field) — entity records in this codebase are flat DB rows (Prisma
 * models), not deeply nested documents, so a shallow comparison is the
 * correct granularity for "changed fields" and keeps previousValues/
 * newValues genuinely readable in an audit UI rather than a wall of
 * nested-path noise.
 */

export interface IEntityDiffResult {
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

const IGNORED_FIELDS = new Set(['updatedAt', 'version']);

export class EntityDiffUtil {
  /**
   * Compares two flat snapshots of the same entity. Fields present in
   * `next` but not `previous` (or vice versa) count as changed.
   * `updatedAt`/`version` are ignored by default (they change on every
   * write regardless of business-meaningful content) — pass
   * `ignoredFields` to override.
   */
  static diff(
    previous: Record<string, unknown> | null | undefined,
    next: Record<string, unknown> | null | undefined,
    ignoredFields: Set<string> = IGNORED_FIELDS,
  ): IEntityDiffResult {
    const prev = previous ?? {};
    const nxt = next ?? {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(nxt)]);

    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const key of allKeys) {
      if (ignoredFields.has(key)) continue;
      if (!EntityDiffUtil.isEqual(prev[key], nxt[key])) {
        changedFields.push(key);
        previousValues[key] = prev[key];
        newValues[key] = nxt[key];
      }
    }

    return { changedFields, previousValues, newValues };
  }

  private static isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a instanceof Date || b instanceof Date) {
      const aTime = a instanceof Date ? a.getTime() : new Date(a as string | number).getTime();
      const bTime = b instanceof Date ? b.getTime() : new Date(b as string | number).getTime();
      return aTime === bTime;
    }
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }
}
