import { Injectable } from '@nestjs/common';
import { STORAGE_CONSTANTS } from '../../common/constants/storage.constants';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
]);

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'dll', 'so',
  'php', 'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py', 'rb',
  'js', 'vbs', 'wsf',
]);

@Injectable()
export class FileSecurityService {
  isMimeTypeAllowed(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
  }

  isExtensionSafe(filename: string): boolean {
    const parts = filename.split('.');
    const ext = parts[parts.length - 1]?.toLowerCase() ?? '';
    return !DANGEROUS_EXTENSIONS.has(ext);
  }

  isSizeAllowed(sizeBytes: number, maxBytes = STORAGE_CONSTANTS.MAX_UPLOAD_SIZE_BYTES): boolean {
    return sizeBytes <= maxBytes;
  }

  validate(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isMimeTypeAllowed(mimeType)) {
      errors.push(`MIME type "${mimeType}" is not permitted`);
    }

    if (!this.isExtensionSafe(filename)) {
      errors.push(`File extension for "${filename}" is not permitted`);
    }

    if (!this.isSizeAllowed(sizeBytes)) {
      errors.push(`File size ${sizeBytes} bytes exceeds the ${STORAGE_CONSTANTS.MAX_UPLOAD_SIZE_BYTES} byte limit`);
    }

    return { valid: errors.length === 0, errors };
  }
}
