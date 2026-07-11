import { Global, Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { ContextMiddleware } from './context.middleware';

@Global()
@Module({
  providers: [ContextService, ContextMiddleware],
  exports: [ContextService, ContextMiddleware],
})
export class ContextModule {}
