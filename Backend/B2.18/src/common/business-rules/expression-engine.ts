/**
 * expression-engine.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Evaluates the small boolean-expression language used by workflow
 * conditions, transition guards, and business rules — e.g.
 * `context.amount > 10000 && context.department == "FINANCE"`.
 *
 * Deliberately NOT implemented with `eval()`/`new Function()`: workflow
 * definitions (and the rule expressions embedded in them) are data that
 * can originate from configuration/admin UIs, not just from developers, so
 * treating them as executable JS would be a code-injection vector. This is
 * a small hand-written recursive-descent parser supporting exactly the
 * grammar below — nothing else is reachable, by construction.
 *
 * Grammar:
 *   expr       := orExpr
 *   orExpr     := andExpr ( '||' andExpr )*
 *   andExpr    := unary ( '&&' unary )*
 *   unary      := '!' unary | comparison
 *   comparison := operand ( ('=='|'!='|'>'|'>='|'<'|'<=') operand )?
 *   operand    := path | literal | '(' expr ')'
 *   path       := identifier ( '.' identifier )*
 *   literal    := number | string | 'true' | 'false' | 'null'
 */

import { Injectable } from '@nestjs/common';

type Token = { type: string; value: string };

class Tokenizer {
  private pos = 0;
  private readonly tokens: Token[] = [];

  constructor(private readonly input: string) {
    this.tokenize();
  }

  private tokenize(): void {
    const re = /\s*(&&|\|\||==|!=|>=|<=|[()!><]|"[^"]*"|'[^']*'|-?\d+(\.\d+)?|[A-Za-z_][A-Za-z0-9_.]*)\s*/y;
    let index = 0;
    while (index < this.input.length) {
      re.lastIndex = index;
      const match = re.exec(this.input);
      if (!match || match[0].trim() === '') {
        if (this.input.slice(index).trim() === '') break;
        throw new Error(`Unexpected token in expression at position ${index}: "${this.input.slice(index)}"`);
      }
      this.tokens.push({ type: 'TOKEN', value: match[1] });
      index += match[0].length;
    }
  }

  getTokens(): Token[] {
    return this.tokens;
  }
}

export class ExpressionSyntaxError extends Error {
  constructor(message: string) {
    super(`Expression syntax error: ${message}`);
    this.name = 'ExpressionSyntaxError';
  }
}

@Injectable()
export class ExpressionEngine {
  /**
   * Evaluates `expression` against `context`. Property paths in the
   * expression (e.g. `context.amount`) are resolved against the `context`
   * object passed in — callers conventionally expose their data under a
   * top-level `context` key, but any root identifier present in the
   * object is resolvable.
   */
  evaluate(expression: string, context: Record<string, unknown>): boolean {
    const tokens = new Tokenizer(expression).getTokens();
    let pos = 0;

    const peek = (): string | undefined => tokens[pos]?.value;
    const consume = (): string => {
      const t = tokens[pos];
      if (!t) throw new ExpressionSyntaxError('Unexpected end of expression');
      pos += 1;
      return t.value;
    };

    const parseOperand = (): unknown => {
      const tok = peek();
      if (tok === undefined) throw new ExpressionSyntaxError('Expected operand');

      if (tok === '(') {
        consume();
        const value = parseOr();
        if (consume() !== ')') throw new ExpressionSyntaxError('Expected ")"');
        return value;
      }
      if (tok === 'true') { consume(); return true; }
      if (tok === 'false') { consume(); return false; }
      if (tok === 'null') { consume(); return null; }
      if (/^-?\d+(\.\d+)?$/.test(tok)) { consume(); return Number(tok); }
      if (/^["'].*["']$/.test(tok)) { consume(); return tok.slice(1, -1); }
      if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(tok)) {
        consume();
        return resolvePath(tok, context);
      }
      throw new ExpressionSyntaxError(`Unexpected token "${tok}"`);
    };

    const parseComparison = (): unknown => {
      const left = parseOperand();
      const op = peek();
      if (op && ['==', '!=', '>', '>=', '<', '<='].includes(op)) {
        consume();
        const right = parseOperand();
        switch (op) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '>': return (left as number) > (right as number);
          case '>=': return (left as number) >= (right as number);
          case '<': return (left as number) < (right as number);
          case '<=': return (left as number) <= (right as number);
        }
      }
      return left;
    };

    const parseUnary = (): unknown => {
      if (peek() === '!') {
        consume();
        return !parseUnary();
      }
      return parseComparison();
    };

    const parseAnd = (): unknown => {
      let left = parseUnary();
      while (peek() === '&&') {
        consume();
        const right = parseUnary();
        left = Boolean(left) && Boolean(right);
      }
      return left;
    };

    const parseOr = (): unknown => {
      let left = parseAnd();
      while (peek() === '||') {
        consume();
        const right = parseAnd();
        left = Boolean(left) || Boolean(right);
      }
      return left;
    };

    if (tokens.length === 0) return true; // empty expression = unconditional pass

    const result = parseOr();
    if (pos !== tokens.length) {
      throw new ExpressionSyntaxError(`Unexpected trailing tokens starting at "${tokens[pos].value}"`);
    }
    return Boolean(result);
  }

  /** Evaluates and swallows syntax/resolution errors into `false`, logging nothing itself — callers decide how to surface failures. */
  evaluateSafe(expression: string, context: Record<string, unknown>): boolean {
    try {
      return this.evaluate(expression, context);
    } catch {
      return false;
    }
  }
}

function resolvePath(path: string, root: Record<string, unknown>): unknown {
  const segments = path.split('.');
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
