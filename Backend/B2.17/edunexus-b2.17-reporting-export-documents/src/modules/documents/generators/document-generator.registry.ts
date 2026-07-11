import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_GENERATORS, IDocumentGenerator } from '../interfaces/document-generator.interface';
import { DocumentType } from '../constants/document-type.enum';
import { ValidationException } from '../../../common/exceptions/validation.exception';

@Injectable()
export class DocumentGeneratorRegistry {
  private readonly registry = new Map<DocumentType, IDocumentGenerator>();

  constructor(@Inject(DOCUMENT_GENERATORS) generators: IDocumentGenerator[]) {
    for (const generator of generators) this.registry.set(generator.type, generator);
  }

  resolve(type: DocumentType): IDocumentGenerator {
    const generator = this.registry.get(type);
    if (!generator) throw new ValidationException(`No document generator registered for type "${type}"`);
    return generator;
  }
}
