import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum IntegrationProviderTypeDto {
  PAYMENT = 'PAYMENT',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  LMS = 'LMS',
  GOVERNMENT = 'GOVERNMENT',
}

export class UpsertIntegrationConfigDto {
  @IsEnum(IntegrationProviderTypeDto)
  providerType!: IntegrationProviderTypeDto;

  @IsString()
  providerKey!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  /** Plain-text credentials (API keys, shortcodes, passkeys). Encrypted at rest before storage; never returned by GET. */
  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;
}
