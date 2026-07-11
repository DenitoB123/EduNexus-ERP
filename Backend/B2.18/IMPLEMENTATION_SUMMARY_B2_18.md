# IMPLEMENTATION SUMMARY — B2.18: Enterprise Workflow, Business Process & Orchestration Framework

## Scope and status

Built standalone against the **B1.1–B2.2 cumulative backend only** (per this milestone's own
instructions: B2.3–B2.20 are independent parallel deliveries, merged at B2.21). It does **not**
depend on or reference the B2.3 Generic Service Layer merge done in a separate conversation —
those two parallel milestones both extend `BaseRepository`/`BaseModel` independently and will
need reconciling at B2.21 (see "B2.21 consolidation notes" below).

No `npm install`/`tsc`/`prisma generate` was run — this environment has no network access.
Every type/interface match below was checked by hand against the real B2.2 source (not
assumed), and every relative import path and named import was verified programmatically
against the actual files in this delivery (see "Verification performed").

## What was built

### Workflow Engine (`common/workflow/`)
- `workflow-engine.service.ts` — `WorkflowEngineService`, the orchestrator. `start()` /
  `advance()` / `cancel()` / `suspend()` / `resume()` / `retry()`. Drives a definition's step
  graph via `driveFrom()`: executes the current step(s) through `WorkflowExecutorService`,
  resolves outgoing transitions (conditional/dynamic routing via `ExpressionEngine`), and
  either continues, waits for external completion, or completes the instance.
- `workflow-versioning.service.ts` — publishes new business versions as new rows (never
  in-place edits), deactivates the prior active version, validates the graph before publish.
- `workflow-template.service.ts` — three ready-made shapes: single approval, sequential
  process, parallel process (fan-out/fan-in).
- `workflow-monitoring.service.ts` — active/completed/failed instance views, execution
  history, and aggregate performance metrics (completion rate, average duration).
- `repositories/` — `WorkflowDefinitionRepository`, `WorkflowInstanceRepository`,
  `WorkflowTaskRepository` extend `BaseRepository<T>` (full audit/soft-delete/tenancy/
  versioning). `WorkflowExecutionLogRepository` does not — it's an append-only audit trail
  (no version/soft-delete fields by design, same reasoning as `ApprovalDecisionRepository`).
- `executors/task-executors.ts` — one executor per `WorkflowStepType`: `HumanTaskExecutor`,
  `ExternalTaskExecutor`, `ScheduledTaskExecutor` (all defer to external completion),
  `AutomatedTaskExecutor` (runs a business-module-registered handler with retry via the
  shared `withRetry` helper).
- `executors/workflow-executor.service.ts` — `WorkflowExecutorService`, dispatches a single
  step to the right executor, creates/updates the `WorkflowTask` record, and holds the
  compensation-handler registry.

### Business Process Engine
Sequential and parallel execution are `WorkflowExecutionMode.SEQUENTIAL`/`PARALLEL` on the
definition; `driveFrom()` processes steps with a `for` loop or `Promise.all` accordingly.
Conditional branching / dynamic routing is transition `condition` expressions evaluated by
`ExpressionEngine`, picked by priority. Nested processes are `WorkflowStepType.SUB_PROCESS`
(interface-level; see "Known gaps" — the actual child-instance wiring is a stub). Long-running
processes fall out naturally: an instance can sit in `RUNNING` with a step `awaitingExternalCompletion`
indefinitely; nothing times it out except an explicit `escalation` policy.

### Approval Framework (`common/approvals/`)
`ApprovalService` implements `IApprovalService`: single/multi-level/parallel-all/parallel-any/
conditional approval via `IApprovalPolicy`, `decide()`/`delegate()`/`escalate()`. Every method
takes `tenantId` explicitly and threads it through every repository call — this was a real bug
I caught and fixed mid-build (see "Bugs caught during self-review").

### Workflow Tasks
`IWorkflowTask`/`WorkflowTaskStatus` cover human/automated/scheduled/external tasks uniformly;
each has `attempts`/`maxAttempts` for retry tracking and `dueAt` for escalation windows.

### State Machine (`common/state-machine/`)
`StateMachine<TState, TEvent>` is genuinely generic — not workflow-specific — with guards,
`onTransition` side effects, a history stack, and one-step `rollback()`. `withRetry()` is a
shared retry-with-backoff helper used by both the engine's `retry()` and `AutomatedTaskExecutor`.
`StateTransitionValidator` builds the canonical `WorkflowInstanceStatus` transition table and
structurally validates a definition's step graph (unreachable steps, dangling transitions,
missing start step) before it's allowed to run.

### Business Rules (`common/business-rules/`)
`ExpressionEngine` is a **hand-written recursive-descent parser/evaluator**, deliberately not
`eval()`/`new Function()` — workflow conditions and approval-level conditions are
configuration data that can originate from an admin UI, not just from developers, so treating
them as executable JS would be a code-injection vector. Supports `&&`, `||`, `!`, comparisons
(`== != > >= < <=`), parenthesization, dotted property paths, and literals. `BusinessRuleEngineService`
evaluates ordered `IBusinessRule[]` sets (priority-ordered, first-match or evaluate-all) on top
of it.

### Automation Framework (`common/automation/`)
`AutomationService` integrates with B2.2's **real, existing** `EventBus` and job infrastructure
— neither is recreated:
- EVENT-triggered: `registerEventTrigger()` subscribes to `EventBus` and starts a workflow
  when the named domain event fires.
- SCHEDULE-triggered: `WorkflowScheduleTriggerJobHandler` self-re-arms via
  `ScheduledJobsService.scheduleAt()` after every fire (success or failure) for a recurring
  interval-based schedule.
- API-triggered: goes straight through `IWorkflowEngine.start({ triggerType: 'API' })`, no
  automation bookkeeping needed.
- CHAINED: `chainWorkflow()` starts a follow-on instance, tagging `parentInstanceId`.
- `WorkflowStepJobHandler` is what makes `SCHEDULED_TASK` steps and escalation checks actually
  fire later via the job queue instead of blocking.

### Shared interfaces / utilities
`IWorkflowEngine`, `IWorkflowExecutor`, `IWorkflowDefinition`, `IBusinessRuleEngine`,
`IApprovalService`, `IStateMachine` all exist as specified. `common/utils/workflow-builder.util.ts`
(fluent builder), `workflow-serialization.util.ts` (versioned JSON export/import),
`process-visualization.util.ts` (renderer-agnostic nodes/edges graph for a frontend diagram —
no rendering logic itself).

### Persistence
`prisma/schema.workflow.additions.prisma` — additive only, not wired into `schema.prisma`
(same parallel-milestone convention as D2.13's org-structure additions). Models:
`WorkflowDefinition`, `WorkflowInstance`, `WorkflowTask`, `ApprovalRequest`, `ApprovalDecision`
(append-only, no version/soft-delete), `WorkflowExecutionLog` (append-only). Every versioned
entity follows the documented enterprise base-field block by hand, per `schema.prisma`'s own
convention (no Prisma-level `BaseEntity` mixin exists to extend). `prisma/seeds/seed-workflow-reference-data.ts`
is an idempotent (upsert-based) reference seed for smoke-testing once merged.

## Integration with existing infrastructure (nothing recreated)

| Need | Existing B2.2 provider used | Recreated? |
|---|---|---|
| Domain events | `EventBus` (infrastructure/events) | No |
| Background/delayed jobs | `JobRegistry`, `ScheduledJobsService` (infrastructure/jobs) | No |
| Logging | `AppLoggerService` (common/logger) | No |
| Multi-tenancy | `BaseModel.tenantId` + tenant param threaded through every repository call | No |
| Persistence/repository pattern | `BaseRepository<T>` | No — extended, not reimplemented |
| Auth/RBAC | **Not integrated** — see "Known gaps" | — |
| CQRS | **Not integrated** — doesn't exist in B2.2 | — |
| Notifications | **Not integrated** — interface exists in B2.2 but no send-capable implementation to call | — |
| Caching | Not used — nothing in this framework has a caching need yet | — |

## Bugs caught and fixed during self-review (not just first-draft output)

1. **Tenant-isolation gap in `ApprovalService`**: an early draft resolved approval requests
   via `findById(id, undefined as never)`, which would have silently dropped the tenant filter
   from the underlying Prisma query. Fixed by adding `tenantId` as an explicit, required
   parameter on every `IApprovalService` method.
2. **Conditional approval levels evaluated against an empty context**: `firstApplicableLevel()`
   was being called with `{}` instead of the workflow instance's actual data, so a conditional
   approval level's expression could never see real values. Fixed by adding a `context` field
   to `IApprovalRequest`/the Prisma model, threading `instance.context` through
   `requestApproval()`, and using the stored context for later level-advancement.
3. **Field-name collision between business template version and optimistic-lock version**:
   `IWorkflowDefinition` originally declared its own `version: number`, which — once intersected
   with `BaseModel` (also `version: number`) in the repository record type — silently
   conflated "which template version is this" with "optimistic-lock row version." Renamed to
   `definitionVersion` on the domain interface, matching the already-distinct Prisma column;
   fixed every call site that referenced the old field.
4. **`AutomatedTaskExecutor.execute()` had more required parameters than `IWorkflowTaskExecutor.execute()`**,
   which would not structurally satisfy the interface. Made the extra parameters optional.
5. Wrong import paths (`../interfaces/...` instead of `../../interfaces/...` from
   `executors/`) and an unregistered job name (`workflow.scheduled-trigger` was referenced but
   had no handler) — both caught by a scripted verification pass (see below), not eyeballing.

## Verification performed (given no compiler access)

- Every relative import path in all 30 new TypeScript files was resolved programmatically
  against the actual file tree — two broken paths found and fixed (see above).
- Every named import was checked against the actual exports of its source file — zero real
  mismatches (two regex false positives on `export async function`, manually confirmed fine).
- Every `BaseRepository`/`PrismaModelDelegate` method call was checked against the real method
  signatures in `common/base/base.repository.ts`, not assumed from the earlier B2.3 work.
- Grepped for lazy `as never`/`as any` escape-hatch casts across all new code — none remain.

## Known gaps (documented, not hidden)

- **`WorkflowEngineService.getInstance(instanceId)` throws by design** — a tenant-agnostic
  public read would bypass tenant isolation; it explicitly directs callers to use
  `WorkflowInstanceRepository.findById(instanceId, tenantId)` from a tenant-scoped context
  (e.g. a future controller with a tenant guard) instead. Not implemented as a silent
  workaround.
- **`SUB_PROCESS` steps are a stub** (`{ completed: false }`) — starting a genuine child
  instance from `WorkflowExecutorService` would need it to depend on `WorkflowEngineService`,
  extending an already-real three-way dependency cycle; deferred rather than forced in under
  time pressure. `AutomationService.chainWorkflow()` demonstrates the pattern for a
  CHAINED-trigger equivalent, which does work end-to-end.
- **Parallel join semantics are simplified**: `PARALLEL_GATEWAY` fans out correctly, but
  "first branch wins, cancel the others" (`PARALLEL_ANY`-style process joins, as opposed to
  the already-implemented `PARALLEL_ANY` *approval* levels, which do work) is not implemented
  — `allBranchesAtEnd()` currently requires every processed branch to reach a natural end.
  Flagged in that method's own doc comment as a documented future extension.
- **No HTTP controllers.** This is the shared framework business modules (B3+) build on, per
  the milestone's own framing ("future modules must reuse this... instead of implementing
  custom workflow logic") — no REST surface was in scope.
- **RBAC/workflow permissions are not enforced.** B2.2 has no real auth module yet (`RolesGuard`/
  `PermissionsGuard` are documented no-ops pending a future Auth milestone) — approval
  authorization currently trusts whatever `approverId`/`assigneeId` the caller supplies. This
  matches B2.2's actual current state rather than fabricating an auth layer that doesn't exist.
- **Escalation and scheduled-step re-arming are not deduplicated** — calling `retry()` on an
  escalation-check job re-evaluates via the generic retry path rather than a dedicated
  escalation handler; functionally works for the documented case but isn't a distinct code
  path yet.

## B2.21 consolidation notes

- This milestone's `schema.workflow.additions.prisma` and B2.3's Generic Service Layer both
  add net-new Prisma models/BaseRepository subclasses independently — no overlapping model
  names, so a straight merge of both additive schema files should be conflict-free.
  `WorkflowDefinitionRepository` etc. here don't depend on B2.3's `GenericRepositoryAdapter`;
  reconciling them (e.g. should workflow repositories eventually use the generic adapter
  instead of extending `BaseRepository` directly?) is a design decision for B2.21, not
  something this milestone should have pre-decided unilaterally.
- `common/business-rules/` here (`ExpressionEngine`, `BusinessRuleEngineService`) is distinct
  from B2.3's `BusinessRulesEngine`/`ValidationPipeline` — same problem space, different
  concrete implementations, built independently per each milestone's own instructions not to
  reference the other. B2.21 should decide which one (or a merged third) becomes canonical
  rather than keeping both.

## Files created

```
src/common/interfaces/workflow.tokens.ts
src/common/interfaces/workflow-definition.interface.ts
src/common/interfaces/workflow-instance.interface.ts
src/common/interfaces/workflow-task.interface.ts
src/common/interfaces/approval.interface.ts
src/common/interfaces/state-machine.interface.ts
src/common/interfaces/business-rule.interface.ts
src/common/interfaces/workflow-engine.interface.ts
src/common/state-machine/state-machine.ts
src/common/state-machine/state-transition.validator.ts
src/common/business-rules/expression-engine.ts
src/common/business-rules/business-rule-engine.service.ts
src/common/workflow/repositories/workflow-definition.repository.ts
src/common/workflow/repositories/workflow-instance.repository.ts
src/common/workflow/repositories/workflow-task.repository.ts
src/common/workflow/repositories/workflow-execution-log.repository.ts
src/common/approvals/repositories/approval-request.repository.ts
src/common/approvals/repositories/approval-decision.repository.ts
src/common/workflow/executors/task-executors.ts
src/common/workflow/executors/workflow-executor.service.ts
src/common/approvals/approval.service.ts
src/common/automation/automation.service.ts
src/common/workflow/workflow-engine.service.ts
src/common/workflow/workflow-versioning.service.ts
src/common/workflow/workflow-template.service.ts
src/common/workflow/workflow-monitoring.service.ts
src/common/workflow/workflow.module.ts
src/common/utils/workflow-builder.util.ts
src/common/utils/workflow-serialization.util.ts
src/common/utils/process-visualization.util.ts
prisma/schema.workflow.additions.prisma
prisma/seeds/seed-workflow-reference-data.ts
IMPLEMENTATION_SUMMARY_B2_18.md
```

No existing B1.1–B2.2 file was modified.

## Confirmation

The Enterprise Workflow, Business Process & Orchestration Framework's core engine, approval
framework, state machine, business rule/expression engine, and automation integration are
functionally complete and internally consistent by manual + scripted review, with the specific
gaps above documented rather than silently glossed over. Future EduNexus business modules
(B3 onward) should consume `WorkflowModule`'s exported services (`WorkflowEngineService`,
`WorkflowVersioningService`, `WorkflowTemplateService`, `ApprovalService`, `AutomationService`,
`BusinessRuleEngineService`) rather than building their own workflow/approval/state-machine
logic — with the understanding that the B2.21 consolidation step still needs to reconcile this
milestone against B2.3's parallel, independently-built business-rule and repository-adapter
work before both are relied upon together in production.
