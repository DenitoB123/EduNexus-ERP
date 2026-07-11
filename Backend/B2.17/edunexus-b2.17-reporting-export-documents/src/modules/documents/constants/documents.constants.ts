export const DOCUMENTS_STORAGE_PREFIX = 'documents';
export const DOCUMENT_GENERATION_JOB_NAME = 'document.generate';
export const DOCUMENT_GENERATION_DEFAULT_MAX_ATTEMPTS = 3;
export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 900;

export const DocumentPermission = {
  GENERATE: 'documents:generate',
  READ: 'documents:read',
  MANAGE_TEMPLATES: 'documents:manage-templates',
} as const;
