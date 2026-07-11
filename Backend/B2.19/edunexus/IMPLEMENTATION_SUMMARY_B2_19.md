# EduNexus Backend — B2.19: Enterprise Communication, Messaging & Collaboration Framework

## Status

**Complete**, built as an independent milestone directly on **B1.1–B2.2 only**, per the EduNexus Parallel Milestone Architecture (B2.3–B2.20 are developed independently and merged at B2.21). Nothing here depends on B2.8 (CQRS) or any other in-flight parallel milestone — this framework uses plain injectable services, the same style as B1/B2.1/B2.2, not the B2.8 Command/Query Bus (which hasn't been merged and, per the parallel-milestone rules, B2.19 cannot assume exists).

84 new TypeScript files (78 implementation + 6 spec) + a ~380-line addition to `prisma/schema.prisma` (10 models, 8 enums) + a 2-line addition to `app.module.ts`. Zero new npm dependencies.

## Files created

```
src/common/
├── messaging/
│   ├── enums/            (8 enum files + barrel)
│   ├── entities/         (10 entity interfaces mirroring the Prisma models + base + barrel)
│   ├── dto/               (CreateConversationInput, SendMessageInput, CreateAnnouncementInput, FlagContentInput + barrel)
│   ├── events/            (8 domain events + barrel)
│   ├── repositories/      (10 repositories extending B2.2's SoftDeleteRepository + barrel)
│   ├── message.service.ts (IMessageService)
│   └── messaging.module.ts
├── conversations/conversation.service.ts (+ .spec)      (IConversationService)
├── announcements/announcement.service.ts                (IAnnouncementService)
├── moderation/moderation.service.ts                      (IModerationService)
├── collaboration/
│   ├── collaboration.service.ts
│   └── collaboration-activity.listener.ts
├── presence/presence.service.ts (+ .spec)                (IPresenceService)
├── delivery/
│   ├── message-delivery.service.ts                       (IMessageDeliveryService)
│   └── jobs/ (MessageNotificationFanoutJob, MessageDeliveryRetryJob)
├── interfaces/communication/    (the 6 required shared interfaces + barrel)
├── providers/communication/     (notification/contact/audience/search/workflow extension points + default bridge + barrel)
└── utils/communication/         (message-formatting, mention-resolution, attachment-validation, rich-content, delivery-tracking + specs + barrel)
```

## Files modified

- `prisma/schema.prisma` — appended 10 models (`Conversation`, `ConversationParticipant`, `Message`, `MessageAttachment`, `MessageReaction`, `MessageMention`, `MessageDeliveryReceipt`, `Announcement`, `ModerationFlag`, `CollaborationActivity`) and 8 enums, all following the mandatory enterprise base-field convention.
- `src/app.module.ts` — added `MessagingModule` import/registration (2 lines).

**Run `npx prisma generate` (and `npx prisma migrate dev` against a real database) before `npm run build`** — these new models only produce real Prisma Client delegate types (`prisma.conversation`, `prisma.message`, etc.) once generated, same as any schema-adding milestone.

## Why participant/actor IDs are plain strings, not relations

No canonical `User` model exists in B1.1–B2.2 (it's being built independently in the parallel D-track). Every `participantId`/`senderId`/`actorId`/`flaggedBy` field here is a plain `String`, not a Prisma relation — reconciled at B2.21 consolidation, the same approach any other identity-touching parallel milestone has to take until then.

## What B1.1–B2.2 infrastructure was reused as-is (not duplicated)

| Concern | Existing component | How B2.19 uses it |
|---|---|---|
| Repository layer | `SoftDeleteRepository`/`AuditableRepository`/`TenantRepository` (B2.2) | Every one of the 10 new repositories extends `SoftDeleteRepository` directly |
| Event bus | `EventBus`/`@OnEvent` (B1.3) | 8 domain events; `CollaborationActivityListener` subscribes to them to build the activity feed instead of every service manually recording activity |
| Background jobs | `JobQueueService`/`JobRegistry`/`JobHandlerBase` (B1.x) | Message notification fan-out and delivery retry are real background jobs, registered manually with `JobRegistry` in `MessagingModule.onModuleInit` (jobs have no auto-discovery explorer, unlike events) |
| Push notifications | `PushService.sendToSubject` (B1.x) | `CommunicationNotificationBridge`'s default, working implementation of `INotificationDispatcher` |
| Email/SMS | `EmailService`/`SmsService` (B1.x) | Used by the same bridge when an `IContactResolver` is registered (see below) |
| Caching/ephemeral state | `RedisService` (B1.x) | `PresenceService` — presence is deliberately Redis-backed with a TTL, not a Prisma table |
| File validation | `FileSecurityService` (security/helpers) | `AttachmentValidationUtil` wraps it, adding only the messaging-specific "max attachments per message" rule |
| Content sanitization | `InputSanitizerService` (security/sanitizers) | `RichContentUtil` wraps it for TEXT/RICH/caption content |
| Multi-tenancy | `TenantQueryHelper` | Every custom repository query method |
| Storage | `IStorageProvider`/`StorageService` (B1.x) | `MessageAttachment.storageKey` references objects uploaded through the existing storage service; this module never writes file bytes itself |

## Extension points registered for genuinely-missing infrastructure

Some of the spec's requested integrations ("Authentication, Authorization... Workflow Framework, Search Framework...") don't exist as standalone systems anywhere in B1.1–B2.2. Rather than build stand-in versions of them, B2.19 defines interfaces + DI tokens so a future milestone can plug in without touching this module's services:

| Gap | Extension point | Default behavior today |
|---|---|---|
| No User/contact directory | `IContactResolver` (`COMMUNICATION_CONTACT_RESOLVER`) | Email/SMS are skipped (debug log); push still works (keyed by opaque `participantId` directly) |
| No audience-targeting domain models | `IAudienceResolver` (`COMMUNICATION_AUDIENCE_RESOLVER`) | `DefaultAudienceResolver` returns an empty recipient list and logs a warning; the `Announcement` row is still created/published regardless |
| No Search Framework | `ISearchIndexProvider` (`COMMUNICATION_SEARCH_INDEX_PROVIDER`) | Not injected anywhere yet (no default binding) — in-database text search via `allowedSearchFields` already works today independent of this |
| No Workflow Framework | `IWorkflowTrigger` (`COMMUNICATION_WORKFLOW_TRIGGER`) | Not injected anywhere yet — reserved for a future milestone to call from wherever it needs to react to communication events |
| No RBAC / Auth module | — | Same documented gap as B2.8: no guard/context exists yet to check "can this actor post to this conversation" beyond the participant-membership checks this module performs itself (is the sender an active, non-left participant; is the conversation locked) |

## Known limitations, documented rather than papered over

- **Conversation creation is two sequential writes, not one transaction.** Creating a `Conversation` then batch-creating its `ConversationParticipant` rows can leave an orphaned zero-participant conversation if the process crashes in between — the same repository transaction-propagation gap already flagged in `IMPLEMENTATION_SUMMARY_B2_8.md` (B2.2's repositories bind their Prisma delegate at construction, with no shared `tx` available to this milestone either).
- **Mention resolution needs a directory this branch doesn't have.** `MentionResolutionUtil.resolveParticipantIds()` needs a handle→participantId map from the caller; `SendMessageInput.mentionedParticipantIds` expects the caller to have already resolved handles to IDs.
- **`AnnouncementService.publishDueScheduled()`** exists and works but nothing calls it on a schedule yet — there's no cron/scheduler component in B1.1–B2.2 to wire it to. A future milestone with a scheduler just needs to call it.

## Verification performed

- All 84 new files pass a TypeScript syntax-only parse (`ts.transpileModule`, zero diagnostics).
- Every relative import resolves to a real file on disk (scripted check across all 10 new subdirectories).
- Cross-referenced every external signature used (`SoftDeleteRepository`/`AuditableRepository`/`TenantRepository`/`PrismaRepository`'s full method set, `TenantQueryHelper`, `RedisService`, `PushService`/`EmailService`/`SmsService`, `FileSecurityService`, `InputSanitizerService`, `JobQueueService`/`JobRegistry`/`JobHandlerBase`, `EventBus`/`DomainEvent`, `PaginatedResult`/`QueryOptions`/`FilterOperator`) directly against the B1–B2.2 source, not assumed — including catching and fixing, mid-build: a `PaginatedResult` shape mismatch (`{items, meta}` not `{items, total, page, pageSize}`), an `id IN (...)` filter that the repository's `allowedFilterFields` allowlist would have silently dropped, several custom repository queries that were missing `excludeSoftDeleted`, and two interface-typed constructor parameters missing the `@Inject(token)` NestJS DI requires for erased TypeScript interfaces.
- No duplicate class/interface/service names against the existing B1–B2.2 codebase.
- 6 spec files: pure-utility coverage for `MentionResolutionUtil`/`MessageFormattingUtil`/`DeliveryTrackingUtil`, `PresenceService` (mocked Redis, covering status defaults, heartbeat-preserves-explicit-status, bulk lookup), `ConversationService` (creation, dedup/role assignment, duplicate-participant rejection), and `MessageService` (locked-conversation/non-participant/not-found guards, receipt initialization + job enqueue, idempotent reactions).

This was **not** run through `nest build`/`jest`/`prisma generate` in this environment (no `node_modules`, no database, no network). Recommend `npx prisma generate && npx prisma migrate dev && npm run build && npm test` as the real gate before merging.

## Confirmation

The Enterprise Communication, Messaging & Collaboration Framework for B2.19 is complete, built only against B1.1–B2.2, and does not duplicate any service, interface, decorator, DI token, or utility from another milestone. All future EduNexus backend business modules (B3 onward) should reuse `MessageService`/`ConversationService`/`MessageDeliveryService`/`PresenceService`/`AnnouncementService`/`ModerationService`/`CollaborationService` (exported from `MessagingModule`) instead of implementing their own messaging or collaboration logic. When B2.3–B2.20 are merged at B2.21, register real implementations under the five extension-point DI tokens listed above to replace the current defaults — no other change to this module should be needed.
