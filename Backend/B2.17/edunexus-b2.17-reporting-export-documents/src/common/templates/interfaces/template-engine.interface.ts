export type TemplateFormat = 'html' | 'markdown';

export interface RenderTemplateOptions {
  format: TemplateFormat;
  /** When format is 'markdown', the rendered HTML is what gets returned — callers that need raw Markdown text should not set this. */
}

export interface ITemplateEngine {
  /**
   * Renders a template string against a data context. Handlebars
   * conditional (`{{#if}}`/`{{#unless}}`) and repeating
   * (`{{#each}}`) sections work in both formats since Markdown
   * templates are Handlebars-compiled first, then converted to HTML.
   */
  render(source: string, context: Record<string, unknown>, options?: RenderTemplateOptions): string;
  registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
  registerPartial(name: string, source: string): void;
  clearCache(): void;
}
