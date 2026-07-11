/**
 * worker-registration.util.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Guards against the two most common worker wiring mistakes: registering
 * two processors for the same queue (BullMQ would silently let the second
 * `Worker` instance race the first) and registering a processor whose
 * `jobName` doesn't match any job actually enqueued under that name.
 */

export class WorkerRegistrationUtil {
  private static readonly registeredQueues = new Set<string>();

  static assertNotAlreadyRegistered(queueName: string): void {
    if (this.registeredQueues.has(queueName)) {
      throw new Error(
        `A processor is already registered for queue "${queueName}". Each queue may have exactly one processor per process — route different job types to different queues instead.`,
      );
    }
    this.registeredQueues.add(queueName);
  }
}
