import { MessageFormattingUtil } from './message-formatting.util';
import { MessageType } from '../../messaging/enums/message-type.enum';

describe('MessageFormattingUtil', () => {
  it('truncates a long TEXT message', () => {
    const preview = MessageFormattingUtil.toPreview('a'.repeat(200), MessageType.TEXT, 10);
    expect(preview.length).toBeLessThanOrEqual(13); // 10 + '...'
  });

  it('returns a fixed placeholder for IMAGE/FILE/VOICE messages', () => {
    expect(MessageFormattingUtil.toPreview('ignored', MessageType.IMAGE)).toBe('📷 Photo');
    expect(MessageFormattingUtil.toPreview('ignored', MessageType.FILE)).toBe('📎 Attachment');
    expect(MessageFormattingUtil.toPreview('ignored', MessageType.VOICE)).toBe('🎤 Voice message');
  });

  it('extracts the text field from RICH JSON content', () => {
    const content = JSON.stringify({ text: 'hello world', blocks: [] });
    expect(MessageFormattingUtil.toPreview(content, MessageType.RICH, 100)).toBe('hello world');
  });

  it('falls back to the raw string when RICH content is not valid JSON', () => {
    expect(MessageFormattingUtil.extractPlainTextFromRich('not json')).toBe('not json');
  });
});
