import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { AppConfigService } from '../../config/app-config.service';
import { ConnectionRetryStrategy } from '../providers/connection-retry.strategy';
import { DatabaseConnectionException } from '../exceptions/database.exceptions';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

@Injectable()
export class DatabaseConnectionManager {
  private state: ConnectionState = 'idle';

  constructor(
    private readonly logger: AppLoggerService,
    private readonly configService: AppConfigService,
  ) {
    this.logger.setContext('DatabaseConnectionManager');
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  async connectWithRetry(connect: () => Promise<void>): Promise<void> {
    this.state = 'connecting';
    const { attempts, delayMs } = this.configService.database.retry;

    try {
      await ConnectionRetryStrategy.execute(
        connect,
        { attempts, delayMs },
        (attempt, error) => {
          this.logger.warn(
            `Database connection attempt ${attempt}/${attempts} failed: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        },
      );
      this.state = 'connected';
      this.logger.log('Database connection established');
    } catch (error) {
      this.state = 'failed';
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Database connection failed after ${attempts} attempts: ${message}`);
      throw new DatabaseConnectionException(`Unable to connect to database: ${message}`);
    }
  }

  markDisconnected(): void {
    this.state = 'disconnected';
  }
}
