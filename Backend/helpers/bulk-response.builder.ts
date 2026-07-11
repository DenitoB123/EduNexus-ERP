import { IBulkOperationResult } from '../interfaces/api.interfaces';

export class BulkResponseBuilder {
  static build<T>(
    succeeded: T[],
    failed: Array<{ index: number; error: string }>,
  ): IBulkOperationResult<T> {
    return {
      succeeded,
      failed,
      total: succeeded.length + failed.length,
      successCount: succeeded.length,
      failureCount: failed.length,
    };
  }

  static empty<T>(): IBulkOperationResult<T> {
    return { succeeded: [], failed: [], total: 0, successCount: 0, failureCount: 0 };
  }
}
