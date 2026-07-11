/**
 * queue-provider.module.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Binds QUEUE_PROVIDER to BullMqQueueProvider. This is the one place a
 * future second engine gets wired in — swap the `useClass` below (or make
 * it config-driven via AppConfigService) and nothing else in this
 * framework needs to change, since everything else depends only on the
 * IQueueProvider interface.
 */

import { Global, Module } from '@nestjs/common';
import { AppLoggerModule } from '../logger/app-logger.module';
import { QUEUE_PROVIDER } from '../interfaces/background/tokens';
import { BullMqQueueProvider } from './bullmq-queue.provider';

@Global()
@Module({
  imports: [AppLoggerModule],
  providers: [{ provide: QUEUE_PROVIDER, useClass: BullMqQueueProvider }],
  exports: [QUEUE_PROVIDER],
})
export class QueueProviderModule {}
