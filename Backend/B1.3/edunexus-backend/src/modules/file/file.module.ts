import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { EventBusModule } from '../event-bus/event-bus.module';

// ─────────────────────────────────────────────────────────────────────────────
// FileModule — Milestone 1.3
// In-memory Multer storage: the buffer is streamed straight to S3 and never
// touches local disk, which matters for a horizontally-scaled deployment
// where the API container's filesystem is ephemeral/shared across replicas.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    AuditLogModule,
    EventBusModule,
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
