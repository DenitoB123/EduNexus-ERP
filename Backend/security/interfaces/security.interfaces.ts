export interface IEncryptionService {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

export interface IHashService {
  hash(value: string): Promise<string>;
  compare(value: string, hashed: string): Promise<boolean>;
}

export interface ISecretProvider {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
