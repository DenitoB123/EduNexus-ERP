const MENTION_TOKEN_PATTERN = /@([a-zA-Z0-9_.-]+)/g;

/**
 * Extracts `@handle` tokens from message content and resolves them
 * against a caller-supplied handle→participantId map. Resolution
 * needs the map because this codebase has no canonical
 * directory/User model yet to look handles up against (parallel
 * D-track) — `MessageService` is expected to obtain that map from
 * whichever participant-lookup mechanism its caller has.
 */
export class MentionResolutionUtil {
  static extractHandles(content: string): string[] {
    const handles = new Set<string>();
    for (const match of content.matchAll(MENTION_TOKEN_PATTERN)) {
      handles.add(match[1]);
    }
    return Array.from(handles);
  }

  static resolveParticipantIds(content: string, participantIdsByHandle: Record<string, string>): string[] {
    const handles = MentionResolutionUtil.extractHandles(content);
    const resolved = new Set<string>();

    for (const handle of handles) {
      const participantId = participantIdsByHandle[handle];
      if (participantId) resolved.add(participantId);
    }

    return Array.from(resolved);
  }
}
