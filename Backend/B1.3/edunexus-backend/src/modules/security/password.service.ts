import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { SECURITY_CONSTANTS } from './security.constants';

/**
 * PasswordService
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized password hashing/verification (bcrypt) and password-strength
 * helpers. The Auth and User modules should depend on this instead of
 * calling bcrypt directly, so the hashing strategy can change in one place.
 */
@Injectable()
export class PasswordService {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SECURITY_CONSTANTS.BCRYPT_ROUNDS);
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Returns true if the hash was generated with a different cost factor
   * than the current SECURITY_CONSTANTS.BCRYPT_ROUNDS — callers can use
   * this to opportunistically re-hash on next successful login.
   */
  needsRehash(hash: string): boolean {
    const rounds = this.extractRounds(hash);
    return rounds !== SECURITY_CONSTANTS.BCRYPT_ROUNDS;
  }

  /** Generates a numeric one-time password, e.g. for 2FA or verification codes. */
  generateOtp(length: number = SECURITY_CONSTANTS.OTP_LENGTH): string {
    const max = 10 ** length;
    const value = randomInt(0, max);
    return value.toString().padStart(length, '0');
  }

  /** Basic strength check beyond DTO-level length validation. */
  isStrongPassword(plainText: string): boolean {
    const hasLower = /[a-z]/.test(plainText);
    const hasUpper = /[A-Z]/.test(plainText);
    const hasDigit = /\d/.test(plainText);
    const hasSpecial = /[^a-zA-Z0-9]/.test(plainText);
    const longEnough = plainText.length >= 8;

    return (
      longEnough && [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length >= 3
    );
  }

  private extractRounds(hash: string): number | null {
    // bcrypt hash format: $2b$<rounds>$<salt+hash>
    const match = /^\$2[aby]\$(\d{2})\$/.exec(hash);
    return match ? parseInt(match[1], 10) : null;
  }
}
