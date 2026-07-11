import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobHandlerBase } from '../../../infrastructure/jobs/job-handler.base';
import { JobPayload } from '../../../infrastructure/interfaces/job.interface';
import { JobRegistry } from '../../../infrastructure/jobs/job-registry.service';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { ReportExecutionRepository } from '../reporting-execution.repository';
import { ReportGenerationRunner } from '../report-generation-runner.service';
import { GenerateReportJobPayload, StoredGenerationRequest } from '../interfaces/generation-job.interface';
import { REPORTING_JOB_NAMES } from '../constants/reporting.constants';

/**
 * Background worker for asynchronous / large report generation.
 * Registered with JobRegistry (see reporting.module.ts) and picked up
 * by the existing worker-manager/queue-consumer infrastructure exactly
 * like infrastructure/email's SendEmailJobHandler. Retry behaviour
 * (attempts/backoff) is handled entirely by the existing
 * RetryJobsService/JobQueueService — this handler simply throws on
 * failure and lets that infrastructure decide whether to requeue.
 */
@Injectable()
export class ReportGenerationJobHandler extends JobHandlerBase<GenerateReportJobPayload> implements OnModuleInit {
  readonly name = REPORTING_JOB_NAMES.GENERATE_REPORT;

  constructor(
    private readonly executionRepository: ReportExecutionRepository,
    private readonly runner: ReportGenerationRunner,
    private readonly jobRegistry: JobRegistry,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext('ReportGenerationJobHandler');
  }

  onModuleInit(): void {
    this.jobRegistry.register(this);
  }

  async process(payload: JobPayload<GenerateReportJobPayload>): Promise<void> {
    const { executionId, tenantId } = payload.data;

    const execution = await this.executionRepository.findById(executionId, tenantId);
    if (!execution) {
      this.logger.error(`Report execution "${executionId}" not found for tenant ${tenantId}; skipping job`);
      return;
    }

    const request = execution.parameters as unknown as StoredGenerationRequest;
    await this.runner.run(execution, request);
  }
}
