import { DocumentType } from '../constants/document-type.enum';
import { BrandingConfig } from '../../reporting/interfaces/branding.interface';

export interface DocumentGenerationInput {
  templateCode: string;
  data: Record<string, unknown>;
  orientation?: 'portrait' | 'landscape';
  watermarkText?: string;
  branding?: BrandingConfig;
  correlationId?: string;
}

export interface GeneratedDocumentResult {
  generationId: string;
  fileKey: string;
  fileSizeBytes: number;
  downloadUrl: string;
}

/**
 * One implementation per DocumentType (generators/*.generator.ts),
 * each declaring its own `requiredFields` for validation but sharing
 * all rendering/PDF/storage/persistence logic via
 * `BaseDocumentGenerator` (generators/base-document.generator.ts) —
 * see that file for why 8 generator classes exist without 8x
 * duplicated logic.
 */
export interface IDocumentGenerator {
  readonly type: DocumentType;
  readonly requiredFields: string[];
  generate(tenantId: string, actorId: string | undefined, input: DocumentGenerationInput): Promise<GeneratedDocumentResult>;
}

export const DOCUMENT_GENERATORS = 'DOCUMENT_GENERATORS';
