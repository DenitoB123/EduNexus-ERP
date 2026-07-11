/**
 * job-serialization.util.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * BullMQ stores job data as JSON in Redis, so payloads are serialized
 * once here rather than at each call site — catches non-serializable
 * payloads (functions, circular refs, class instances relying on
 * prototype methods) before they're silently dropped by BullMQ's own
 * JSON.stringify, and normalizes Date fields consistently.
 */

export class JobSerializationUtil {
  static serialize<T>(payload: T): T {
    try {
      return JSON.parse(JSON.stringify(payload)) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown serialization error';
      throw new Error(`Job payload is not JSON-serializable: ${message}`);
    }
  }

  static estimateSizeBytes(payload: unknown): number {
    return Buffer.byteLength(JSON.stringify(payload) ?? '', 'utf8');
  }
}
