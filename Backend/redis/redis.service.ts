import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';
import { AppConfigService } from '../../config/app-config.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClient;
  private isReady = false;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('RedisService');
  }

  async onModuleInit(): Promise<void> {
    const { host, port, password, db, tls, keyPrefix } = this.configService.redis;

    this.client = new Redis({
      host,
      port,
      password,
      db,
      keyPrefix,
      tls: tls ? {} : undefined,
      retryStrategy: (attempt: number) => Math.min(attempt * 200, 5000),
      reconnectOnError: () => true,
      maxRetriesPerRequest: 5,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`, error.stack);
    });

    this.client.on('reconnecting', () => {
      this.isReady = false;
      this.logger.warn('Redis client reconnecting...');
    });

    this.client.on('close', () => {
      this.isReady = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection gracefully closed');
    }
  }

  getClient(): RedisClient {
    return this.client;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  get ready(): boolean {
    return this.isReady;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}
