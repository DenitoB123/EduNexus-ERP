import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class TranscriptGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.TRANSCRIPT;
  readonly requiredFields = ['studentName', 'admissionNumber', 'courses'];
}
