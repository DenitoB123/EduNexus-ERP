/**
 * business-rules-engine.ts
 *
 * B2.3 — Generic Service Layer — Business Rules Engine
 *
 * Injectable, reusable infrastructure for registering and executing
 * business rules. Business modules (B3+) inject BusinessRulesEngine,
 * register their domain-specific IBusinessRule implementations against a
 * named "operation key" (e.g. "student.enroll", "invoice.create"), and
 * BaseService/CrudService subclasses invoke the engine as part of
 * pre-create/pre-update/pre-delete validation.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { IBusinessRule, IBusinessRuleResult } from './business-rule.interface';
import { BusinessRuleViolationException, IFailedRule } from './business-rule.exception';
import { IRequestContext } from '../interfaces/context.interfaces';
import { APP_LOGGER } from '../interfaces/tokens';
import { IAppLogger } from '../interfaces/infrastructure.interfaces';

export type RuleExecutionMode = 'all' | 'stopOnFirstFailure';

export interface IRuleExecutionOptions {
  mode?: RuleExecutionMode;
}

@Injectable()
export class BusinessRulesEngine {
  private readonly registry = new Map<string, IBusinessRule[]>();

  constructor(@Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger) {}

  /**
   * Registers a rule under an operation key. Multiple rules may be
   * registered under the same key — they will all be evaluated together
   * (rule chaining) when execute() is called for that key.
   */
  register(operationKey: string, rule: IBusinessRule): void {
    const existing = this.registry.get(operationKey) ?? [];
    if (existing.some((r) => r.name === rule.name)) {
      throw new Error(
        `Business rule "${rule.name}" is already registered for operation "${operationKey}".`,
      );
    }
    existing.push(rule);
    this.registry.set(operationKey, existing);
    this.logger?.debug(`Registered business rule "${rule.name}" for "${operationKey}"`, 'BusinessRulesEngine');
  }

  registerMany(operationKey: string, rules: IBusinessRule[]): void {
    rules.forEach((rule) => this.register(operationKey, rule));
  }

  unregister(operationKey: string, ruleName: string): void {
    const existing = this.registry.get(operationKey);
    if (!existing) return;
    this.registry.set(
      operationKey,
      existing.filter((r) => r.name !== ruleName),
    );
  }

  getRules(operationKey: string): IBusinessRule[] {
    return [...(this.registry.get(operationKey) ?? [])];
  }

  /**
   * Evaluates all rules chained under operationKey against payload/context.
   * Throws BusinessRuleViolationException if any rule fails.
   */
  async execute<TPayload = unknown>(
    operationKey: string,
    payload: TPayload,
    context: IRequestContext,
    options: IRuleExecutionOptions = {},
  ): Promise<void> {
    const rules = this.registry.get(operationKey);
    if (!rules || rules.length === 0) {
      return;
    }

    const mode: RuleExecutionMode = options.mode ?? 'all';
    const failedRules: IFailedRule[] = [];

    for (const rule of rules) {
      const start = Date.now();
      let result: IBusinessRuleResult;
      try {
        result = await rule.evaluate(payload, context);
      } catch (error) {
        this.logger?.error(
          `Business rule "${rule.name}" threw an unexpected error`,
          error instanceof Error ? error.stack : undefined,
          'BusinessRulesEngine',
        );
        throw error;
      }

      this.logger?.metric(`business_rule.${rule.name}.duration_ms`, Date.now() - start);

      if (!result.passed) {
        failedRules.push({
          ruleName: rule.name,
          message: result.message ?? `Rule "${rule.name}" failed.`,
          details: result.details,
        });
        this.logger?.warn(`Business rule failed: ${rule.name}`, 'BusinessRulesEngine', {
          operationKey,
          message: result.message,
        });
        if (mode === 'stopOnFirstFailure') {
          break;
        }
      }
    }

    if (failedRules.length > 0) {
      throw new BusinessRuleViolationException(failedRules);
    }
  }

  /** Non-throwing variant, useful when a caller wants to inspect all failures instead of catching an exception. */
  async evaluateAll<TPayload = unknown>(
    operationKey: string,
    payload: TPayload,
    context: IRequestContext,
  ): Promise<IFailedRule[]> {
    const rules = this.registry.get(operationKey) ?? [];
    const failedRules: IFailedRule[] = [];

    for (const rule of rules) {
      const result = await rule.evaluate(payload, context);
      if (!result.passed) {
        failedRules.push({
          ruleName: rule.name,
          message: result.message ?? `Rule "${rule.name}" failed.`,
          details: result.details,
        });
      }
    }
    return failedRules;
  }
}
