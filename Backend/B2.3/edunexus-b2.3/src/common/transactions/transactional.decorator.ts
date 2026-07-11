/**
 * transactional.decorator.ts
 *
 * B2.3 — Generic Service Layer — Transaction Support
 *
 * Method decorator that wraps a service method body in a transaction using
 * the instance's injected `transactionManager` (expected to satisfy
 * ITransactionManager — see transaction-manager.interface.ts). Intended for
 * use on business-module service methods that need atomic multi-step writes
 * beyond what a single generic-service call provides.
 *
 * Usage:
 *
 *   class EnrollmentService extends CrudService<...> {
 *     @Transactional()
 *     async enrollStudent(dto: EnrollDto, context: IRequestContext) {
 *       // multiple writes across repositories, all-or-nothing
 *     }
 *   }
 *
 * Requires the decorated class to expose a `transactionManager` property
 * implementing ITransactionManager (BaseService does, via constructor
 * injection — see ../services/base.service.ts).
 */

import { ITransactionManager, ITransactionOptions } from './transaction-manager.interface';

interface IHasTransactionManager {
  transactionManager?: ITransactionManager;
}

export function Transactional(options?: ITransactionOptions): MethodDecorator {
  return function (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: IHasTransactionManager, ...args: unknown[]) {
      if (!this.transactionManager) {
        throw new Error(
          `@Transactional() used on "${String(propertyKey)}" but no transactionManager is available on this instance. ` +
            `Ensure the service extends BaseService and TRANSACTION_MANAGER is provided.`,
        );
      }
      return this.transactionManager.runInTransaction(async () => {
        return originalMethod.apply(this, args);
      }, options);
    };

    return descriptor;
  };
}
