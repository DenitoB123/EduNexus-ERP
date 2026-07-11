import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { marked } from 'marked';
import { ITemplateEngine, RenderTemplateOptions, TemplateFormat } from './interfaces/template-engine.interface';

/**
 * B2.17's general-purpose ITemplateEngine.
 *
 * Two near-identical "Handlebars.compile + cache" engines already
 * exist — `infrastructure/email/email-template.engine.ts` and B2.12's
 * `modules/reporting/templates/template-branding.engine.ts` — both
 * narrow to their own module and neither supports Markdown. Rather
 * than add a third copy-pasted variant, this is the one canonical,
 * general-purpose engine going forward: it does everything those two
 * do (Handlebars compile-and-cache, conditionals via `{{#if}}`,
 * repeating sections via `{{#each}}` — native Handlebars, not
 * reimplemented) plus Markdown source support, custom helpers, and
 * partials. `modules/documents/*` (this milestone's new Document
 * Generation Framework) uses this engine exclusively.
 *
 * `EmailTemplateEngine` and `TemplateBrandingEngine` are left exactly
 * as they are — both are other milestones' files, still correct and
 * still in use — rather than modified to redirect to this one; doing
 * that consolidation safely (verifying nothing depends on a subtle
 * difference) is exactly the kind of cross-cutting change that
 * belongs at B2.21, not inside a single new milestone. See
 * IMPLEMENTATION_SUMMARY_B2_17.md §4.
 */
@Injectable()
export class TemplateEngineService implements ITemplateEngine {
  private readonly compiledCache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly handlebars = Handlebars.create();

  constructor() {
    this.handlebars.registerHelper('formatDate', (value: unknown, pattern?: string) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(date.getTime())) return '';
      return pattern === 'long'
        ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : date.toLocaleDateString();
    });

    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

  render(source: string, context: Record<string, unknown>, options?: RenderTemplateOptions): string {
    const format: TemplateFormat = options?.format ?? 'html';
    const compiled = this.getCompiled(source);
    const rendered = compiled(context);

    return format === 'markdown' ? (marked.parse(rendered, { async: false }) as string) : rendered;
  }

  registerHelper(name: string, fn: (...args: unknown[]) => unknown): void {
    this.handlebars.registerHelper(name, fn);
    // A newly registered helper can change how previously compiled
    // templates would render, so the cache is invalidated rather than
    // risking stale output using the old helper set.
    this.compiledCache.clear();
  }

  registerPartial(name: string, source: string): void {
    this.handlebars.registerPartial(name, source);
    this.compiledCache.clear();
  }

  clearCache(): void {
    this.compiledCache.clear();
  }

  private getCompiled(source: string): Handlebars.TemplateDelegate {
    let compiled = this.compiledCache.get(source);
    if (!compiled) {
      compiled = this.handlebars.compile(source, { noEscape: false });
      this.compiledCache.set(source, compiled);
    }
    return compiled;
  }
}
