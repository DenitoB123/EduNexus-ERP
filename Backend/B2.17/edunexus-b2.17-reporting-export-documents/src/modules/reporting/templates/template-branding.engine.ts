import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { BrandingConfig } from '../interfaces/branding.interface';

/**
 * Resolves branding placeholders (institution name, logo, colors,
 * footer, address) inside template strings such as a report's footer
 * text or a custom header line. Mirrors
 * infrastructure/email/email-template.engine.ts's compile-and-cache
 * approach so both stay consistent for future maintainers.
 */
@Injectable()
export class TemplateBrandingEngine {
  private readonly compiledCache = new Map<string, Handlebars.TemplateDelegate>();

  render(source: string, branding?: BrandingConfig, extra?: Record<string, unknown>): string {
    let compiled = this.compiledCache.get(source);
    if (!compiled) {
      compiled = Handlebars.compile(source);
      this.compiledCache.set(source, compiled);
    }
    return compiled({ branding: branding ?? {}, ...extra });
  }

  clearCache(): void {
    this.compiledCache.clear();
  }
}
