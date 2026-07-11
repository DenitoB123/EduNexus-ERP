import { FileSecurityService } from '../../../security/helpers/file-security.service';
import { SendMessageAttachmentInput } from '../../messaging/dto/send-message.dto';

const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export interface AttachmentValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Thin orchestration over the existing `FileSecurityService`
 * (security/helpers, B1.x) — per-file MIME/extension/size checks are
 * NOT reimplemented here, only the messaging-specific "how many
 * attachments can one message have" rule is added on top.
 *
 * A static method taking `FileSecurityService` as a parameter,
 * matching this codebase's existing `*.util.ts` convention (stateless
 * static classes, e.g. `StringUtil`/`FileUtil`) rather than
 * introducing a DI-based utility — the caller (`MessageService`, an
 * `@Injectable()`) already has `FileSecurityService` injected and
 * passes it through.
 */
export class AttachmentValidationUtil {
  static validate(
    attachments: SendMessageAttachmentInput[],
    fileSecurityService: FileSecurityService,
  ): AttachmentValidationResult {
    const errors: string[] = [];

    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      errors.push(`A message may have at most ${MAX_ATTACHMENTS_PER_MESSAGE} attachments (got ${attachments.length})`);
    }

    for (const attachment of attachments) {
      const result = fileSecurityService.validate(attachment.fileName, attachment.mimeType, attachment.sizeBytes);
      if (!result.valid) {
        errors.push(...result.errors.map((e) => `${attachment.fileName}: ${e}`));
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
