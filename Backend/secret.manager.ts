import { Injectable } from '@nestjs/common';
import { EnvironmentSecretLoader } from './environment-secret.loader';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class SecretManager {
  constructor(
    private readonly secretProvider: EnvironmentSecretLoader,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('SecretManager');
  }

  async get(key: string): Promise<string | undefined> {
    return this.secretProvider.get(key);
  }

  async getRequired(key: string): Promise<string> {
    const value = await this.secretProvider.get(key);
    if (!value) {
      throw new Error(`Required secret "${key}" is not set`);
    }
    return value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.secretProvider.set(key, value, ttlSeconds);
    this.logger.log(`Secret "${key}" updated`);
  }

  async rotate(key: string, newValue: string): Promise<void> {
    await this.secretProvider.set(key, newValue);
    this.logger.log(`Secret "${key}" rotated`);
  }

  async delete(key: string): Promise<void> {
    await this.secretProvider.delete(key);
    this.logger.log(`Secret "${key}" deleted`);
  }
}
