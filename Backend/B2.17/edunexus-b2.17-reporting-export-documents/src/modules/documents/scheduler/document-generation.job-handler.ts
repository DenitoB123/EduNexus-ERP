import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobHandlerBase } from '../../../infrastructure/jobs/job-handler.base';
import { JobRegistry } from '../../../infrastructure/jobs/job-registry.service';
import { JobPayload } from '../../../infrastructure/interfaces/job.interface';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { DocumentGeneratorRegistry } from '../generators/document-generator.registry';
import { DocumentType } from '../constants/document-type.enum';
import { GenerateDocumentDto } from '../dto/generate-document.dto';
import { DOCUMENT_GENERATION_JOB_NAME } from '../constants/documents.constants';

export interface DocumentGenerationJobData {
  tenantId: string;
  actorId?: string;
  type: DocumentType;
  request: GenerateDocumentDto;
}

/**
 * Background/queued path for document generation — used for bulk
 * batches (e.g. a future Academic module generating 200 report cards
 * for a class at term end) via `JobQueueService.enqueue(DOCUMENT_GENERATION_JOB_NAME, ...)`
 * instead of the synchronous `DocumentsController.generate()` REST
 * call. Registered with the existing B2.2
 * JobRegistry/RabbitMQ-consumer retry pipeline exactly like B2.10's
 * `SendNotificationJobHandler` and B2.12's report generation job
 * handler — no new queue infrastructure introduced.
 */
@Injectable()
export class DocumentGenerationJobHandler extends JobHandlerBase<DocumentGenerationJobData> implements OnModuleInit {
  readonly name = DOCUMENT_GENERATION_JOB_NAME;

  constructor(
    private readonly jobRegistry: JobRegistry,
    private readonly generatorRegistry: DocumentGeneratorRegistry,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext(DocumentGenerationJobHandler.name);
  }

  onModuleInit(): void {
    this.jobRegistry.register(this);
  }

  async process(payload: JobPayload<DocumentGenerationJobData>): Promise<void> {
    const { tenantId, actorId, type, request } = payload.data;
    const generator = this.generatorRegistry.resolve(type);

    const result = await generator.generate(tenantId, actorId, {
      templateCode: request.templateCode,
      data: request.data,
      orientation: request.orientation,
      watermarkText: request.watermarkText,
      correlationId: request.correlationId,
    });

    this.logger.log(`Queued document generation completed: ${result.generationId} (${type})`);
  }
}
