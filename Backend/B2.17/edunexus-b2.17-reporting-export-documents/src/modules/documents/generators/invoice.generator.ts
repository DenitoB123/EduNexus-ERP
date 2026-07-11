import { Injectable } from '@nestjs/common';
import { BaseDocumentGenerator } from './base-document.generator';
import { DocumentType } from '../constants/document-type.enum';

@Injectable()
export class InvoiceGenerator extends BaseDocumentGenerator {
  readonly type = DocumentType.INVOICE;
  readonly requiredFields = ['billTo', 'invoiceNumber', 'lineItems', 'totalAmount', 'dueDate'];
}
