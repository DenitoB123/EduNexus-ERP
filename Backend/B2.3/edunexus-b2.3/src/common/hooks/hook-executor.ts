/**
 * hook-executor.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Small helper used internally by BaseService to invoke an optional
 * lifecycle hook if the concrete subclass defined one, with consistent
 * logging and error propagation.
 */

import { IAppLogger } from '../interfaces/infrastructure.interfaces';
import { ServiceHookName } from './service-hooks.interface';

export class HookExecutor {
  constructor(
    private readonly serviceName: string,
    private readonly logger?: IAppLogger,
  ) {}

  async run<TArgs extends unknown[], TResult>(
    hookName: ServiceHookName,
    hookFn: ((...args: TArgs) => Promise<TResult> | TResult) | undefined,
    args: TArgs,
    fallback: TResult,
  ): Promise<TResult> {
    if (!hookFn) {
      return fallback;
    }

    const start = Date.now();
    try {
      const result = await hookFn(...args);
      this.logger?.debug(`Hook executed: ${hookName}`, this.serviceName, {
        durationMs: Date.now() - start,
      });
      return result;
    } catch (error) {
      this.logger?.error(
        `Hook failed: ${hookName}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
        { error: error instanceof Error ? error.message : String(error) },
      );
      throw error;
    }
  }
}
