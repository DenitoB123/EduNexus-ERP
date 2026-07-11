import { InputSanitizerService } from '../../../security/sanitizers/input-sanitizer.service';
import { MessageType } from '../../messaging/enums/message-type.enum';

/**
 * Sanitizes message content before persistence. Delegates the actual
 * XSS/HTML sanitization to the existing `InputSanitizerService`
 * (security/sanitizers, B1.x) — this only decides *what* to sanitize
 * for each `MessageType` (a RICH message's JSON-serialized `text`
 * field vs. a plain TEXT message's raw string).
 */
export class RichContentUtil {
  static sanitize(content: string, type: MessageType, sanitizer: InputSanitizerService): string {
    if (type === MessageType.TEXT || type === MessageType.SYSTEM) {
      return sanitizer.sanitizeString(content);
    }

    if (type === MessageType.RICH) {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const sanitized = sanitizer.sanitizeObject(parsed);
        return JSON.stringify(sanitized);
      } catch {
        // Not valid JSON — treat as plain text rather than persisting unsanitized content.
        return sanitizer.sanitizeString(content);
      }
    }

    // FILE / IMAGE / VOICE: `content` is typically a short caption; sanitize it the same way as TEXT.
    return sanitizer.sanitizeString(content);
  }
}
