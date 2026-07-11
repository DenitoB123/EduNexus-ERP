import { TransactionService } from '../../database/services/transaction.service';

interface HasTransactionService {
  transactionService: TransactionService;
}

/**
 * Wraps the decorated method's execution in a Prisma transaction.
 * Requires the host class to expose a `transactionService: TransactionService`
 * property (constructor-injected), since decorators run before DI
 * has bound `this` and cannot inject dependencies themselves.
 */
export function Transactional(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = function (this: HasTransactionService, ...args: unknown[]) {
      return this.transactionService.run(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
