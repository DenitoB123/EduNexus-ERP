import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  // ── App ────────────────────────────────────────────────────────────────────

  get nodeEnv(): string {
    return this.configService.get<string>('app.env', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get appPort(): number {
    return this.configService.get<number>('app.port', 3000);
  }

  get appHost(): string {
    return this.configService.get<string>('app.host', '0.0.0.0');
  }

  get apiPrefix(): string {
    return this.configService.get<string>('app.apiPrefix', 'api');
  }

  get apiVersion(): string {
    return this.configService.get<string>('app.apiVersion', 'v1');
  }

  get corsOrigins(): string[] {
    return this.configService
      .get<string>('app.corsOrigins', 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim());
  }

  // ── Database ───────────────────────────────────────────────────────────────

  get databaseUrl(): string {
    const url = this.configService.get<string>('database.url');
    if (!url) throw new Error('DATABASE_URL is not defined');
    return url;
  }

  get databasePoolMin(): number {
    return this.configService.get<number>('database.poolMin', 2);
  }

  get databasePoolMax(): number {
    return this.configService.get<number>('database.poolMax', 10);
  }

  // ── Logging ────────────────────────────────────────────────────────────────

  get logLevel(): string {
    return this.configService.get<string>('logging.level', 'debug');
  }

  get logDir(): string {
    return this.configService.get<string>('logging.dir', 'logs');
  }

  get logMaxFiles(): string {
    return this.configService.get<string>('logging.maxFiles', '14d');
  }

  get logMaxSize(): string {
    return this.configService.get<string>('logging.maxSize', '20m');
  }

  // ── Security ───────────────────────────────────────────────────────────────

  get jwtSecret(): string {
    const secret = this.configService.get<string>('security.jwtSecret');
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return secret;
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('security.jwtExpiresIn', '1d');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>(
      'security.jwtRefreshExpiresIn',
      '7d',
    );
  }

  get encryptionKey(): string {
    const key = this.configService.get<string>('security.encryptionKey');
    if (!key) throw new Error('ENCRYPTION_KEY is not defined');
    return key;
  }

  get hmacSecret(): string {
    const secret = this.configService.get<string>('security.hmacSecret');
    if (!secret) throw new Error('HMAC_SECRET (or JWT_SECRET) is not defined');
    return secret;
  }

  // ── Throttle ───────────────────────────────────────────────────────────────

  get throttleTtl(): number {
    return this.configService.get<number>('throttle.ttl', 60);
  }

  get throttleLimit(): number {
    return this.configService.get<number>('throttle.limit', 100);
  }

  // ── Redis ──────────────────────────────────────────────────────────────────

  get redisHost(): string {
    return this.configService.get<string>('redis.host', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('redis.port', 6379);
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('redis.password');
  }

  get redisDb(): number {
    return this.configService.get<number>('redis.db', 0);
  }

  // ── Storage (S3-compatible) ─────────────────────────────────────────────────

  get s3Endpoint(): string | undefined {
    return this.configService.get<string>('storage.endpoint');
  }

  get s3Region(): string {
    return this.configService.get<string>('storage.region', 'us-east-1');
  }

  get s3Bucket(): string {
    return this.configService.get<string>('storage.bucket', 'edunexus-files');
  }

  get s3AccessKeyId(): string {
    const v = this.configService.get<string>('storage.accessKeyId');
    if (!v) throw new Error('S3_ACCESS_KEY_ID is not defined');
    return v;
  }

  get s3SecretAccessKey(): string {
    const v = this.configService.get<string>('storage.secretAccessKey');
    if (!v) throw new Error('S3_SECRET_ACCESS_KEY is not defined');
    return v;
  }

  get s3ForcePathStyle(): boolean {
    return this.configService.get<boolean>('storage.forcePathStyle', true);
  }

  get maxFileSizeBytes(): number {
    return this.configService.get<number>(
      'storage.maxFileSizeBytes',
      25 * 1024 * 1024,
    );
  }

  get signedUrlExpirySeconds(): number {
    return this.configService.get<number>('storage.signedUrlExpirySeconds', 900);
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────

  get jobDefaultAttempts(): number {
    return this.configService.get<number>('jobs.defaultAttempts', 3);
  }

  get jobDefaultBackoffMs(): number {
    return this.configService.get<number>('jobs.defaultBackoffMs', 5000);
  }

  get jobRemoveOnComplete(): number {
    return this.configService.get<number>('jobs.removeOnComplete', 500);
  }

  get jobRemoveOnFail(): number {
    return this.configService.get<number>('jobs.removeOnFail', 1000);
  }

  // ── Generic accessor ───────────────────────────────────────────────────────

  get<T>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue as T) as T;
  }
}
