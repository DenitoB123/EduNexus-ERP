import { Injectable, BadRequestException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { AppConfigService } from '../../config/config.service';
import { SECURITY_CONSTANTS, SECURITY_ERRORS } from './security.constants';

/**
 * EncryptionService
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized symmetric encryption (AES-256-GCM) and HMAC signing, reusable
 * across all modules that need to protect data at rest (e.g. SystemSettings
 * with isSecret = true, third-party API credentials, PII fields).
 *
 * Ciphertext format (single string, safe to store in a String column):
 *   base64(iv) + ':' + base64(authTag) + ':' + base64(encrypted)
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: AppConfigService) {
    this.key = this.deriveKey(this.config.encryptionKey);
  }

  // ── Symmetric encryption ────────────────────────────────────────────────────

  encrypt(plainText: string): string {
    const iv = randomBytes(SECURITY_CONSTANTS.ENCRYPTION_IV_LENGTH);
    const cipher = createCipheriv(
      SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM,
      this.key,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException(SECURITY_ERRORS.INVALID_CIPHERTEXT);
    }

    const [ivB64, authTagB64, encryptedB64] = parts;

    try {
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const encrypted = Buffer.from(encryptedB64, 'base64');

      const decipher = createDecipheriv(
        SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM,
        this.key,
        iv,
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      throw new BadRequestException(SECURITY_ERRORS.INVALID_CIPHERTEXT);
    }
  }

  /** Encrypts a JSON-serializable value, returning a storable ciphertext string. */
  encryptJson(value: unknown): string {
    return this.encrypt(JSON.stringify(value));
  }

  /** Decrypts and parses a ciphertext previously produced by encryptJson(). */
  decryptJson<T = unknown>(cipherText: string): T {
    return JSON.parse(this.decrypt(cipherText)) as T;
  }

  // ── HMAC ─────────────────────────────────────────────────────────────────────

  sign(payload: string): string {
    return createHmac(SECURITY_CONSTANTS.HMAC_ALGORITHM, this.config.hmacSecret)
      .update(payload)
      .digest('hex');
  }

  verifySignature(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return this.timingSafeEqual(expected, signature);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Accepts the configured ENCRYPTION_KEY as either a 64-char hex string or
   * any other string and normalizes it to a 32-byte key via SHA-256-style
   * derivation, so operators don't have to hand-craft an exact-length key.
   */
  private deriveKey(rawKey: string): Buffer {
    const hexCandidate = Buffer.from(rawKey, 'hex');
    if (
      hexCandidate.length === SECURITY_CONSTANTS.ENCRYPTION_KEY_LENGTH &&
      /^[0-9a-fA-F]+$/.test(rawKey)
    ) {
      return hexCandidate;
    }

    // Fall back: hash arbitrary-length secret down to exactly 32 bytes.
    return createHmac('sha256', 'edunexus-key-derivation')
      .update(rawKey)
      .digest();
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
