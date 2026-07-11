import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

// ─────────────────────────────────────────────────────────────────────────────
// SecurityModule — Milestone 1.3
// Centralized, reusable security primitives consumed by Auth, User,
// SystemSettings (secret values), File (signed URLs), and Audit Log.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  providers: [EncryptionService, PasswordService, TokenService],
  exports: [EncryptionService, PasswordService, TokenService],
})
export class SecurityModule {}
