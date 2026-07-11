import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service';
import { HashService } from '../hash/hash.service';
import { SecureRandomGenerator } from '../encryption/secure-random.generator';
import { InputSanitizerService } from '../sanitizers/input-sanitizer.service';
import { ResponseSanitizerService } from '../sanitizers/response-sanitizer.service';
import { FileSecurityService } from '../helpers/file-security.service';
import { SecretManager } from '../secrets/secret.manager';

@Injectable()
export class SecurityService {
  constructor(
    public readonly encryption: EncryptionService,
    public readonly hash: HashService,
    public readonly random: SecureRandomGenerator,
    public readonly inputSanitizer: InputSanitizerService,
    public readonly responseSanitizer: ResponseSanitizerService,
    public readonly fileSecurity: FileSecurityService,
    public readonly secrets: SecretManager,
  ) {}
}
