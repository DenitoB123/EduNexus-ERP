export type ConfigurationSeverity = 'error' | 'warning';

export interface ConfigurationIssue {
  key: string;
  message: string;
  severity: ConfigurationSeverity;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  profile: string;
  issues: ConfigurationIssue[];
  checkedAt: Date;
}

/**
 * Environment variable syntax/type validation already happens at
 * process start via config/env.validation.ts's Joi schema (enforced
 * by @nestjs/config before the module tree even builds) — this
 * interface is deliberately NOT another copy of that. It covers
 * cross-field, environment-profile-aware business rules Joi's flat
 * schema can't express, e.g. "if STORAGE_PROVIDER=s3, the S3_*
 * fields must be set" or "JWT_SECRET and JWT_REFRESH_SECRET must
 * differ". See ConfigurationValidatorService for the concrete rules.
 */
export interface IConfigurationValidator {
  validate(): ConfigurationValidationResult;
}
