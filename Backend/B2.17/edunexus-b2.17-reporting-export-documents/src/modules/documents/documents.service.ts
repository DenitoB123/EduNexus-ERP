import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { DocumentGeneratorRegistry } from './generators/document-generator.registry';
import { DocumentGenerationRepository, DocumentGenerationModel } from './document-generation.repository';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { DocumentGenerationQueryDto } from './dto/document-generation-query.dto';
import { GeneratedDocumentResult } from './interfaces/document-generator.interface';
import { SignedUrlService } from '../../infrastructure/storage/signed-url.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { DocumentGenerationStatus } from './constants/document-type.enum';
import { DOCUMENT_SIGNED_URL_TTL_SECONDS } from './constants/documents.constants';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly registry: DocumentGeneratorRegistry,
    private readonly generationRepository: DocumentGenerationRepository,
    private readonly signedUrlService: SignedUrlService,
  ) {}

  async generate(tenantId: string, actorId: string | undefined, dto: GenerateDocumentDto): Promise<GeneratedDocumentResult> {
    const generator = this.registry.resolve(dto.type);
    return generator.generate(tenantId, actorId, {
      templateCode: dto.templateCode,
      data: dto.data,
      orientation: dto.orientation,
      watermarkText: dto.watermarkText,
      correlationId: dto.correlationId,
    });
  }

  async getGeneration(id: string, tenantId: string): Promise<DocumentGenerationModel> {
    const record = await this.generationRepository.findById(id, tenantId);
    if (!record) throw new ResourceNotFoundException('DocumentGeneration', id);
    return record;
  }

  async listGenerations(tenantId: string, query: DocumentGenerationQueryDto): Promise<PaginatedResult<DocumentGenerationModel>> {
    const filters = [
      query.type ? { field: 'type', operator: 'eq' as const, value: query.type } : null,
      query.status ? { field: 'status', operator: 'eq' as const, value: query.status } : null,
    ].filter(Boolean) as { field: string; operator: 'eq'; value: unknown }[];

    return this.generationRepository.findMany(
      { filters, pagination: { page: query.page ?? 1, pageSize: query.pageSize ?? 20 } },
      tenantId,
    );
  }

  async getDownloadUrl(id: string, tenantId: string): Promise<string> {
    const record = await this.getGeneration(id, tenantId);
    if (record.status !== DocumentGenerationStatus.COMPLETED || !record.fileKey) {
      throw new ValidationException(`Document generation "${id}" is not yet completed (status: ${record.status})`);
    }
    return this.signedUrlService.getSignedUrl(record.fileKey, {
      expiresInSeconds: DOCUMENT_SIGNED_URL_TTL_SECONDS,
      operation: 'get',
    });
  }
}
