/**
 * Marker/base class for Domain Services: stateless operations that
 * span multiple aggregates and therefore don't belong on any single
 * entity (e.g. "TransferStudentBetweenCampuses" touching both the
 * source and destination campus aggregates). Domain services must
 * remain free of infrastructure concerns (no direct Prisma/HTTP/queue
 * access) — those belong in the application/service layer built on
 * top of BaseService.
 */
export abstract class DomainService {}
