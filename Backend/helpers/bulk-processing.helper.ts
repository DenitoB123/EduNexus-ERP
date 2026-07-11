import { IBulkOperationResult } from '../interfaces/api.interfaces';
import { BulkResponseBuilder } from '../helpers/bulk-response.builder';

export class BulkProcessingHelper {
  static async process<TInput, TOutput>(
    items: TInput[],
    handler: (item: TInput, index: number) => Promise<TOutput>,
    options: { failFast?: boolean } = {},
  ): Promise<IBulkOperationResult<TOutput>> {
    const succeeded: TOutput[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i += 1) {
      try {
        succeeded.push(await handler(items[i], i));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ index: i, error: message });

        if (options.failFast) {
          return BulkResponseBuilder.build(succeeded, failed);
        }
      }
    }

    return BulkResponseBuilder.build(succeeded, failed);
  }
}
