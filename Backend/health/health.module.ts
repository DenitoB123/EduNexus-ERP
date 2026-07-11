import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq-health.indicator';

@Module({
  imports: [TerminusModule.forRoot()],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, RabbitMQHealthIndicator],
})
export class HealthModule {}
