import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class CertificateGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.CERTIFICATE;
  readonly requiredFields = ['recipientName', 'achievement', 'issueDate'];
}
