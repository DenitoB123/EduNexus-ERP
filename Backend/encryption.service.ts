import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { IEncryptionService } from '../interfaces/security.interfaces';

@Injectable()
export class EncryptionService implements IEncryptionService {
  private keyHex: string;

  constructor(private readonly configService: AppConfigService) {
    this.keyHex = this.configService.security.encryptionKeyHex || EncryptionUtil.generateKeyHex();
  }

  encrypt(plainText: string): string {
    return EncryptionUtil.encrypt(plainText, this.keyHex);
  }

  decrypt(cipherText: string): string {
    return EncryptionUtil.decrypt(cipherText, this.keyHex);
  }
}
