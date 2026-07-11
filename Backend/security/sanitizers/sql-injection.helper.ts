const SQL_KEYWORDS = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|CAST|CONVERT|DECLARE|FETCH|KILL|OPEN|WAITFOR)\b/gi;
const SQL_COMMENT_PATTERN = /(--|\/\*|\*\/|;)/g;

export class SqlInjectionHelper {
  static containsSqlPattern(value: string): boolean {
    return SQL_KEYWORDS.test(value) || SQL_COMMENT_PATTERN.test(value);
  }

  static sanitize(value: string): string {
    return value
      .replace(SQL_COMMENT_PATTERN, '')
      .replace(/'/g, "''");
  }

  static escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
