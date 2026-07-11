import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import {
  IConfigurationValidator,
  ConfigurationIssue,
  ConfigurationValidationResult,
} from '../interfaces/configuration-validator.interface';

/**
 * Runs cross-field / environment-profile-aware checks that Joi's flat
 * key-by-key schema (config/env.validation.ts) can't express — that
 * schema already runs earlier and harder-fails process start on any
 * type/required-field violation, so this never re-checks anything Joi
 * already covers. This only checks relationships between fields.
 */
@Injectable()
export class ConfigurationValidatorService implements IConfigurationValidator {
  constructor(private readonly configService: AppConfigService) {}

  validate(): ConfigurationValidationResult {
    const issues: ConfigurationIssue[] = [
      ...this.checkStorageProviderCredentials(),
      ...this.checkJwtSecrets(),
      ...this.checkProductionHardening(),
    ];

    return {
      valid: issues.every((i) => i.severity !== 'error'),
      profile: this.configService.app.nodeEnv,
      issues,
      checkedAt: new Date(),
    };
  }

  private checkStorageProviderCredentials(): ConfigurationIssue[] {
    const issues: ConfigurationIssue[] = [];
    const storage = this.configService.storage;

    if (storage.provider === 's3' && (!storage.s3.accessKeyId || !storage.s3.secretAccessKey || !storage.s3.bucket)) {
      issues.push({
        key: 'STORAGE_PROVIDER=s3',
        message: 'STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, and STORAGE_S3_SECRET_ACCESS_KEY are all required when STORAGE_PROVIDER=s3',
        severity: 'error',
      });
    }

    if (storage.provider === 'minio' && (!storage.minio.accessKeyId || !storage.minio.secretAccessKey || !storage.minio.bucket)) {
      issues.push({
        key: 'STORAGE_PROVIDER=minio',
        message: 'STORAGE_MINIO_BUCKET, STORAGE_MINIO_ACCESS_KEY_ID, and STORAGE_MINIO_SECRET_ACCESS_KEY are all required when STORAGE_PROVIDER=minio',
        severity: 'error',
      });
    }

    if (storage.provider === 'azure' && (!storage.azure.accountName || !storage.azure.accountKey || !storage.azure.containerName)) {
      issues.push({
        key: 'STORAGE_PROVIDER=azure',
        message: 'STORAGE_AZURE_ACCOUNT_NAME, STORAGE_AZURE_ACCOUNT_KEY, and STORAGE_AZURE_CONTAINER_NAME are all required when STORAGE_PROVIDER=azure',
        severity: 'error',
      });
    }

    if (storage.provider === 'gcs' && (!storage.gcs.clientEmail || !storage.gcs.privateKey || !storage.gcs.bucketName)) {
      issues.push({
        key: 'STORAGE_PROVIDER=gcs',
        message: 'STORAGE_GCS_BUCKET_NAME, STORAGE_GCS_CLIENT_EMAIL, and STORAGE_GCS_PRIVATE_KEY are all required when STORAGE_PROVIDER=gcs',
        severity: 'error',
      });
    }

    return issues;
  }

  private checkJwtSecrets(): ConfigurationIssue[] {
    const issues: ConfigurationIssue[] = [];
    const jwt = this.configService.jwt;

    if (jwt.secret && jwt.refreshSecret && jwt.secret === jwt.refreshSecret) {
      issues.push({
        key: 'JWT_SECRET',
        message: 'JWT_SECRET and JWT_REFRESH_SECRET must not be identical',
        severity: 'error',
      });
    }

    return issues;
  }

  private checkProductionHardening(): ConfigurationIssue[] {
    const issues: ConfigurationIssue[] = [];
    const app = this.configService.app;
    const security = this.configService.security;

    if (app.nodeEnv === 'production') {
      if (app.corsOrigins.includes('*')) {
        issues.push({
          key: 'APP_CORS_ORIGINS',
          message: 'Wildcard CORS origin ("*") should not be used in production',
          severity: 'warning',
        });
      }
      if (!security.enableHsts) {
        issues.push({
          key: 'ENABLE_HSTS',
          message: 'HSTS is disabled in a production environment',
          severity: 'warning',
        });
      }
      if (!security.enableCsp) {
        issues.push({
          key: 'ENABLE_CSP',
          message: 'Content-Security-Policy is disabled in a production environment',
          severity: 'warning',
        });
      }
    }

    return issues;
  }
}
