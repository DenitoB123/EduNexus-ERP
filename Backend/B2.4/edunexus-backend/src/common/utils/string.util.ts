/**
 * string.util.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 */

/** Naive English pluralization + kebab/lowercasing, used only as a default route path when IControllerOptions.path is omitted. Business modules should supply an explicit `path` for anything this heuristic gets wrong. */
export function toDefaultRoutePath(entityName: string): string {
  const kebab = entityName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  if (kebab.endsWith('y') && !/[aeiou]y$/.test(kebab)) {
    return `${kebab.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/.test(kebab)) {
    return `${kebab}es`;
  }
  return `${kebab}s`;
}
