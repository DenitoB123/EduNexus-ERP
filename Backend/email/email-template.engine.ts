import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailTemplateEngine {
  private readonly compiledCache = new Map<string, Handlebars.TemplateDelegate>();

  render(templateSource: string, context: Record<string, unknown>): string {
    let compiled = this.compiledCache.get(templateSource);

    if (!compiled) {
      compiled = Handlebars.compile(templateSource);
      this.compiledCache.set(templateSource, compiled);
    }

    return compiled(context);
  }

  clearCache(): void {
    this.compiledCache.clear();
  }
}
