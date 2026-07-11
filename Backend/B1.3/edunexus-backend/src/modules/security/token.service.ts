import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { EncryptionService } from './encryption.service';
import { SECURITY_CONSTANTS, SECURITY_ERRORS } from './security.constants';

export interface SignedTokenPayload {
  [key: string]: unknown;
  exp: number; // unix seconds
}

/**
 * TokenService
 * ─────────────────────────────────────────────────────────────────────────────
 * Generation and validation of opaque, non-JWT tokens used outside the main
 * auth flow: password-reset links, email-verification links, API keys,
 * one-time invite links, etc. (JWT access/refresh tokens remain owned by
 * the Auth module's JwtModule/JwtStrategy — this service does not replace
 * that, it covers everything that isn't a session token.)
 */
@Injectable()
export class TokenService {
  constructor(private readonly encryption: EncryptionService) {}

  // ── Opaque random tokens ─────────────────────────────────────────────────────

  /** Generates a URL-safe random token. Store only its hash; return the raw value to the user. */
  generateRandomToken(bytes: number = SECURITY_CONSTANTS.RANDOM_TOKEN_BYTES): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** One-way hash for storing a token reference (e.g. password_reset_tokens.tokenHash). */
  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  verifyTokenHash(rawToken: string, expectedHash: string): boolean {
    return this.hashToken(rawToken) === expectedHash;
  }

  // ── Purpose-built helpers ────────────────────────────────────────────────────

  generatePasswordResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = this.generateRandomToken();
    return {
      token,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(
        Date.now() + SECURITY_CONSTANTS.PASSWORD_RESET_TTL_SECONDS * 1000,
      ),
    };
  }

  generateEmailVerificationToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = this.generateRandomToken();
    return {
      token,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(
        Date.now() + SECURITY_CONSTANTS.EMAIL_VERIFICATION_TTL_SECONDS * 1000,
      ),
    };
  }

  /** Generates a presentable API key plus the hash to persist (never store the raw key). */
  generateApiKey(prefix = 'enx'): { apiKey: string; keyHash: string } {
    const raw = this.generateRandomToken(24);
    const apiKey = `${prefix}_${raw}`;
    return { apiKey, keyHash: this.hashToken(apiKey) };
  }

  // ── Signed, self-contained tokens (encrypted JSON payload) ──────────────────
  // Useful for stateless tokens that carry their own expiry/claims without a
  // DB lookup, e.g. signed download links for the File module.

  createSignedToken<T extends Record<string, unknown>>(
    payload: T,
    ttlSeconds: number,
  ): string {
    const fullPayload: SignedTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    return this.encryption.encryptJson(fullPayload);
  }

  verifySignedToken<T extends Record<string, unknown>>(token: string): T {
    let payload: SignedTokenPayload;
    try {
      payload = this.encryption.decryptJson<SignedTokenPayload>(token);
    } catch {
      throw new BadRequestException(SECURITY_ERRORS.TOKEN_INVALID);
    }

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException(SECURITY_ERRORS.TOKEN_EXPIRED);
    }

    return payload as unknown as T;
  }
}
