import { AnnouncementAudienceType } from '../enums/announcement-audience-type.enum';

/**
 * `audienceFilter` is deliberately an open bag rather than a fixed
 * shape — audience targeting rules (by department, role, cohort,
 * etc.) depend on domain models (Departments, Roles) that don't
 * exist in this branch yet (B1.1-B2.2 only). `AnnouncementService`
 * persists whatever is given here as-is (Prisma `Json` column) and
 * resolves it into an actual recipient list via the
 * `IAudienceResolver` extension point (see
 * `interfaces/communication/announcement-service.interface.ts`) —
 * this milestone does not itself know how to resolve "all Grade 10
 * students" into participant IDs.
 */
export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audienceType: AnnouncementAudienceType;
  audienceFilter?: Record<string, unknown>;
  scheduledAt?: Date;
}
