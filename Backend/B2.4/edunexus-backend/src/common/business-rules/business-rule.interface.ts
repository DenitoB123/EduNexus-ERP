/**
 * business-rule.interface.ts
 *
 * B2.3 — Generic Service Layer — Business Rules Engine
 */

import { IRequestContext } from '../interfaces/context.interfaces';

export interface IBusinessRuleResult {
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * A single, independently-testable business rule. Business modules (B3+)
 * implement this interface for each domain rule (e.g. "StudentMustBeEnrolledRule",
 * "InvoiceCannotExceedCreditLimitRule") and register instances with the
 * BusinessRulesEngine for the operations they apply to.
 */
export interface IBusinessRule<TPayload = unknown> {
  /** Unique, stable rule name. Used in exceptions, logs, and rule chaining. */
  readonly name: string;

  /** Optional human-readable description, useful for admin tooling / audit trails. */
  readonly description?: string;

  /**
   * Evaluate the rule against the given payload and context.
   * Should not throw for ordinary rule failures — return { passed: false, message }
   * instead. Throwing is reserved for unexpected/infrastructure errors.
   */
  evaluate(payload: TPayload, context: IRequestContext): Promise<IBusinessRuleResult> | IBusinessRuleResult;
}
