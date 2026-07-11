import { Global, Module } from '@nestjs/common';
import { AppLoggerModule } from './logger/app-logger.module';

@Global()
@Module({
  imports: [AppLoggerModule],
  exports: [AppLoggerModule],
})
export class CommonModule {}
