/**
 * workflow.module.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Wires every piece above into one NestJS module. Imports existing
 * infrastructure (PrismaModule, EventModule, JobModule, AppLoggerModule)
 * rather than recreating any of it — none of those providers are
 * redeclared here.
 *
 * Circular dependency note: WorkflowEngineService <-> WorkflowExecutorService
 * <-> ApprovalService <-> WorkflowEngineService, and WorkflowEngineService
 * <-> AutomationService, form genuine cycles (the engine drives the
 * executor which drives approvals/automation which call back into the
 * engine on external resolution). Every edge that closes a cycle uses
 * `forwardRef()` on both the `@Inject` site and, for the two pairs split
 * across this single module, that's sufficient — see NestJS's circular
 * dependency docs. All of it lives in one module specifically to keep
 * that resolvable without cross-module forwardRef additionally.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventModule } from '../../infrastructure/events/event.module';
import { JobModule } from '../../infrastructure/jobs/job.module';
import { AppLoggerModule } from '../logger/app-logger.module';

// Interfaces / state machine / business rules
import { StateTransitionValidator } from '../state-machine/state-transition.validator';
import { ExpressionEngine } from '../business-rules/expression-engine';
import { BusinessRuleEngineService } from '../business-rules/business-rule-engine.service';

// Repositories
import { WorkflowDefinitionRepository } from './repositories/workflow-definition.repository';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { WorkflowTaskRepository } from './repositories/workflow-task.repository';
import { WorkflowExecutionLogRepository } from './repositories/workflow-execution-log.repository';
import { ApprovalRequestRepository } from '../approvals/repositories/approval-request.repository';
import { ApprovalDecisionRepository } from '../approvals/repositories/approval-decision.repository';

// Executors
import {
  HumanTaskExecutor,
  ExternalTaskExecutor,
  ScheduledTaskExecutor,
  AutomatedTaskExecutor,
} from './executors/task-executors';
import { WorkflowExecutorService } from './executors/workflow-executor.service';

// Core services
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowVersioningService } from './workflow-versioning.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowMonitoringService } from './workflow-monitoring.service';
import { ApprovalService } from '../approvals/approval.service';
import { AutomationService, WorkflowStepJobHandler, WorkflowScheduleTriggerJobHandler } from '../automation/automation.service';

@Module({
  imports: [PrismaModule, EventModule, JobModule, AppLoggerModule],
  providers: [
    // State machine / business rules
    StateTransitionValidator,
    ExpressionEngine,
    BusinessRuleEngineService,

    // Repositories
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    WorkflowTaskRepository,
    WorkflowExecutionLogRepository,
    ApprovalRequestRepository,
    ApprovalDecisionRepository,

    // Task executors
    HumanTaskExecutor,
    ExternalTaskExecutor,
    ScheduledTaskExecutor,
    AutomatedTaskExecutor,
    WorkflowExecutorService,

    // Orchestration core
    WorkflowEngineService,
    WorkflowVersioningService,
    WorkflowTemplateService,
    WorkflowMonitoringService,

    // Approvals
    ApprovalService,

    // Automation
    WorkflowStepJobHandler,
    WorkflowScheduleTriggerJobHandler,
    AutomationService,
  ],
  exports: [
    ExpressionEngine,
    BusinessRuleEngineService,
    StateTransitionValidator,
    WorkflowEngineService,
    WorkflowVersioningService,
    WorkflowTemplateService,
    WorkflowMonitoringService,
    ApprovalService,
    AutomationService,
    AutomatedTaskExecutor, // exported so business modules can registerHandler() for their AUTOMATED_TASK steps
    WorkflowExecutorService, // exported so business modules can registerCompensationHandler()
  ],
})
export class WorkflowModule {}
