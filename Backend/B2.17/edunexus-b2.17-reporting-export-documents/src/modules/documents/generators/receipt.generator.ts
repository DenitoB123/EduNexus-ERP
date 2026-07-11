import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class ReceiptGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.RECEIPT;
  readonly requiredFields = ['payerName', 'amount', 'paymentDate', 'receiptNumber'];
}
