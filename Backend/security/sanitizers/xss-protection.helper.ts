const HTML_TAG_PATTERN = /<[^>]*>/g;
const JS_PROTOCOL_PATTERN = /javascript:/gi;
const EVENT_HANDLER_PATTERN = /on\w+\s*=/gi;
const SCRIPT_BLOCK_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

export class XssProtectionHelper {
  static stripTags(value: string): string {
    return value
      .replace(SCRIPT_BLOCK_PATTERN, '')
      .replace(HTML_TAG_PATTERN, '');
  }

  static sanitize(value: string): string {
    return value
      .replace(SCRIPT_BLOCK_PATTERN, '')
      .replace(JS_PROTOCOL_PATTERN, '')
      .replace(EVENT_HANDLER_PATTERN, '')
      .replace(/<[^>]*>/g, '');
  }

  static isClean(value: string): boolean {
    return (
      !/<script/i.test(value) &&
      !JS_PROTOCOL_PATTERN.test(value) &&
      !EVENT_HANDLER_PATTERN.test(value)
    );
  }
}
