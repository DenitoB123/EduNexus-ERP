import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class ReportCardGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.REPORT_CARD;
  readonly requiredFields = ['studentName', 'term', 'subjects'];
}
