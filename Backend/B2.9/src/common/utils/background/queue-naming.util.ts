/**
 * queue-naming.util.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Enforces one naming convention for every queue this framework creates:
 * `edunexus.bg.<domain>.<name>` — the `edunexus.bg.` prefix keeps this
 * framework's BullMQ queues visually and namespace-distinct from the
 * existing RabbitMQ queue names (`edunexus.jobs.*`, see
 * infrastructure/jobs/job.constants.ts) so operators reading Redis/RabbitMQ
 * tooling side by side never have to guess which system owns which queue.
 */

const QUEUE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export class QueueNamingUtil {
  static build(domain: string, name: string): string {
    this.assertValidSegment(domain, 'domain');
    this.assertValidSegment(name, 'name');
    return `edunexus.bg.${domain}.${name}`;
  }

  static isManagedByThisFramework(queueName: string): boolean {
    return queueName.startsWith('edunexus.bg.');
  }

  private static assertValidSegment(segment: string, label: string): void {
    if (!QUEUE_NAME_PATTERN.test(segment)) {
      throw new Error(
        `Invalid queue-name ${label} "${segment}": must be lowercase alphanumeric with hyphens only.`,
      );
    }
  }
}
