import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class AdmissionLetterGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.ADMISSION_LETTER;
  readonly requiredFields = ['applicantName', 'programName', 'admissionYear'];
}
