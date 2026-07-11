import { MessageType } from '../../messaging/enums/message-type.enum';
import { StringUtil } from '../string.util';

/** Formats a message's `content` into a short, human-readable preview — conversation list rows, push notification bodies, etc. */
export class MessageFormattingUtil {
  static toPreview(content: string, type: MessageType, maxLength = 140): string {
    switch (type) {
      case MessageType.IMAGE:
        return '📷 Photo';
      case MessageType.FILE:
        return '📎 Attachment';
      case MessageType.VOICE:
        return '🎤 Voice message';
      case MessageType.SYSTEM:
        return StringUtil.truncate(content, maxLength);
      case MessageType.RICH:
        return StringUtil.truncate(MessageFormattingUtil.extractPlainTextFromRich(content), maxLength);
      case MessageType.TEXT:
      default:
        return StringUtil.truncate(content, maxLength);
    }
  }

  /** Best-effort plain-text extraction from a RICH message's JSON-serialized content, defaulting to the raw string if it isn't parseable JSON with a `text` field. */
  static extractPlainTextFromRich(content: string): string {
    try {
      const parsed = JSON.parse(content) as { text?: unknown };
      return typeof parsed.text === 'string' ? parsed.text : content;
    } catch {
      return content;
    }
  }
}
