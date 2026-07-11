import * as path from 'path';

export class FileUtil {
  static getExtension(filename: string): string {
    return path.extname(filename).replace('.', '').toLowerCase();
  }

  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
  }

  static buildKey(...segments: string[]): string {
    return segments
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
  }
}
