import { randomUUID } from 'crypto';

/**
 * B2.17 addition — no equivalent existed. Report/document storage
 * keys were being built ad hoc inline in B2.12's
 * `report-generation-runner.service.ts` (`report_${execution.id}.${ext}`
 * under a fixed prefix); this generalizes that into a reusable
 * utility for both reporting and the new documents module, without
 * changing how B2.12 already builds its own keys.
 */
export class FileNamingUtil {
  /** Converts arbitrary text into a filesystem/URL-safe slug: lowercase, alphanumeric + hyphens only. */
  static slugify(text: string): string {
    return text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
  }

  /** e.g. buildName('Term 1 Report Card', 'pdf') -> "term-1-report-card-20260703-a1b2c3d4.pdf" */
  static buildName(baseName: string, extension: string, date: Date = new Date()): string {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = randomUUID().split('-')[0];
    const slug = FileNamingUtil.slugify(baseName) || 'file';
    return `${slug}-${datePart}-${shortId}.${extension.replace(/^\./, '')}`;
  }

  /** Builds a tenant-scoped storage key, e.g. "documents/{tenantId}/2026/07/{fileName}". */
  static buildStorageKey(prefix: string, tenantId: string, fileName: string, date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${prefix}/${tenantId}/${year}/${month}/${fileName}`;
  }
}
