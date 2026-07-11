import { EncryptionService } from './encryption.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    const keyHex = EncryptionUtil.generateKeyHex();
    const configMock = { security: { encryptionKeyHex: keyHex } };
    service = new EncryptionService(configMock as never);
  });

  it('encrypts and decrypts a value round-trip', () => {
    const plainText = 'sensitive-data';
    const cipher = service.encrypt(plainText);
    expect(cipher).not.toBe(plainText);
    expect(service.decrypt(cipher)).toBe(plainText);
  });

  it('produces different ciphertext for the same input each time (random IV)', () => {
    const a = service.encrypt('hello');
    const b = service.encrypt('hello');
    expect(a).not.toBe(b);
  });

  it('falls back to an ephemeral key when no key is configured', () => {
    const configMock = { security: { encryptionKeyHex: '' } };
    const fallbackService = new EncryptionService(configMock as never);
    const cipher = fallbackService.encrypt('test');
    expect(fallbackService.decrypt(cipher)).toBe('test');
  });
});
