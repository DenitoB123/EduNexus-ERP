import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class EmploymentLetterGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.EMPLOYMENT_LETTER;
  readonly requiredFields = ['employeeName', 'position', 'startDate'];
}
