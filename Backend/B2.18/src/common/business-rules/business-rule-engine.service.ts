/**
 * business-rule-engine.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 */

import { Injectable } from '@nestjs/common';
import { ExpressionEngine } from './expression-engine';
import {
  IBusinessRule,
  IBusinessRuleEngine,
  IRuleContext,
  IRuleEvaluationResult,
} from '../interfaces/business-rule.interface';

@Injectable()
export class BusinessRuleEngineService implements IBusinessRuleEngine {
  constructor(private readonly expressionEngine: ExpressionEngine) {}

  async evaluateAll(rules: IBusinessRule[], context: IRuleContext): Promise<IRuleEvaluationResult[]> {
    const ordered = [...rules].filter((r) => r.isActive).sort((a, b) => b.priority - a.priority);
    return ordered.map((rule) => this.evaluateOne(rule, context));
  }

  async evaluateFirstMatch(rules: IBusinessRule[], context: IRuleContext): Promise<IBusinessRule | null> {
    const ordered = [...rules].filter((r) => r.isActive).sort((a, b) => b.priority - a.priority);
    for (const rule of ordered) {
      const result = this.evaluateOne(rule, context);
      if (result.matched) return rule;
    }
    return null;
  }

  evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
    return this.expressionEngine.evaluate(expression, context);
  }

  private evaluateOne(rule: IBusinessRule, context: IRuleContext): IRuleEvaluationResult {
    try {
      const matched = this.expressionEngine.evaluate(rule.expression, context);
      return { ruleId: rule.id, matched };
    } catch (error) {
      return { ruleId: rule.id, matched: false, error: error instanceof Error ? error.message : 'Unknown evaluation error' };
    }
  }
}
