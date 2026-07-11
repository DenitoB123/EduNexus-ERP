import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq-health.indicator';

// B2.20: added `exports`. These three indicators previously existed
// only for HealthController's own use. StartupVerifierService
// (common/startup) now reuses them at boot rather than re-implementing
// database/redis/rabbitmq connectivity checks — see
// IMPLEMENTATION_SUMMARY_B2_20.md §4 "Files Modified". No behavioral
// change to any existing /health/* route.
@Module({
  imports: [TerminusModule.forRoot()],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, RabbitMQHealthIndicator],
  exports: [PrismaHealthIndicator, RedisHealthIndicator, RabbitMQHealthIndicator],
})
export class HealthModule {}
