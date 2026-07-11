/**
 * business-rule.exception.ts
 *
 * B2.3 — Generic Service Layer — Business Rules Engine
 *
 * Thrown by BusinessRulesEngine when one or more registered rules fail.
 * Wraps details in a shape consumable by the shared enterprise exception
 * framework (via IExceptionFactory.businessRuleViolation, when available),
 * but is safe to throw standalone if that factory has not been wired yet.
 */

export interface IFailedRule {
  ruleName: string;
  message: string;
  details?: Record<string, unknown>;
}

export class BusinessRuleViolationException extends Error {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly httpStatus = 422;
  readonly failedRules: IFailedRule[];

  constructor(failedRules: IFailedRule[]) {
    const message =
      failedRules.length === 1
        ? `Business rule "${failedRules[0].ruleName}" failed: ${failedRules[0].message}`
        : `${failedRules.length} business rules failed: ${failedRules.map((r) => r.ruleName).join(', ')}`;
    super(message);
    this.name = 'BusinessRuleViolationException';
    this.failedRules = failedRules;
    Object.setPrototypeOf(this, BusinessRuleViolationException.prototype);
  }
}
