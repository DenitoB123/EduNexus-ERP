import { AppLoggerService } from '../logger/app-logger.service';

export abstract class BaseController {
  constructor(protected readonly logger: AppLoggerService) {
    this.logger.setContext(this.constructor.name);
  }
}
