import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common/base/base.repository';
import { BaseModel } from '../../database/interfaces/base-model.interface';
import { DocumentType, DocumentGenerationStatus } from './constants/document-type.enum';

export interface DocumentGenerationModel extends BaseModel {
  templateId: string;
  type: DocumentType;
  status: DocumentGenerationStatus;
  data: Record<string, unknown>;
  fileKey: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  requestedBy: string | null;
  correlationId: string | null;
  completedAt: Date | null;
}

@Injectable()
export class DocumentGenerationRepository extends BaseRepository<DocumentGenerationModel> {
  protected readonly modelName = 'DocumentGeneration';
  protected readonly allowedFilterFields = ['templateId', 'type', 'status', 'correlationId'];

  constructor(private readonly prisma: PrismaService) {
    super(
      (prisma as unknown as { documentGeneration: BaseRepository<DocumentGenerationModel>['delegate'] }).documentGeneration,
    );
  }
}
