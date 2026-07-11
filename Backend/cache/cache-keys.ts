export class CacheKeys {
  static build(...parts: Array<string | number>): string {
    return parts.map((p) => String(p)).join(':');
  }

  static tenantScoped(tenantId: string, ...parts: Array<string | number>): string {
    return this.build('tenant', tenantId, ...parts);
  }

  static pattern(prefix: string): string {
    return `${prefix}*`;
  }
}
