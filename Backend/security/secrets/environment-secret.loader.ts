import { Injectable } from '@nestjs/common';
import { ISecretProvider } from '../interfaces/security.interfaces';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class EnvironmentSecretLoader implements ISecretProvider {
  private readonly overrides = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('EnvironmentSecretLoader');
  }

  async get(key: string): Promise<string | undefined> {
    const override = this.overrides.get(key);

    if (override) {
      if (override.expiresAt && Date.now() > override.expiresAt) {
        this.overrides.delete(key);
      } else {
        return override.value;
      }
    }

    return process.env[key];
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.overrides.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.overrides.delete(key);
  }
}
