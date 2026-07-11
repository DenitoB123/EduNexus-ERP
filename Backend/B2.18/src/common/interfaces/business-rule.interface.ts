/**
 * business-rule.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Reusable business-rule/expression contracts. Distinct from (and not
 * merged with) B2.3's BusinessRulesEngine, which is a standalone parallel
 * milestone not yet part of the cumulative B1.1–B2.2 foundation this
 * milestone builds on — see B2.21 consolidation notes in the implementation
 * summary for how the two should be reconciled later.
 */

export interface IRuleContext {
  tenantId: string;
  actorId?: string;
  [key: string]: unknown;
}

export interface IRuleEvaluationResult {
  ruleId: string;
  matched: boolean;
  error?: string;
}

/** A single condition/expression rule with a priority; evaluated by ExpressionEngine. */
export interface IBusinessRule {
  id: string;
  name: string;
  /** e.g. "context.amount > 10000 && context.department == 'FINANCE'" */
  expression: string;
  priority: number;
  isActive: boolean;
  description?: string;
}

export interface IBusinessRuleEngine {
  /** Evaluates every active rule in `rules` (highest priority first) against context; returns each rule's result. */
  evaluateAll(rules: IBusinessRule[], context: IRuleContext): Promise<IRuleEvaluationResult[]>;
  /** Returns the highest-priority matching rule, or null if none matched. */
  evaluateFirstMatch(rules: IBusinessRule[], context: IRuleContext): Promise<IBusinessRule | null>;
  /** Evaluates a single raw expression string against context. Used directly by workflow conditions/transitions. */
  evaluateExpression(expression: string, context: Record<string, unknown>): boolean;
}
