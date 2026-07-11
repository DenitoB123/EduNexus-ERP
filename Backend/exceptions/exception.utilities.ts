import { BaseException } from './base.exception';

export class ExceptionUtilities {
  static isBaseException(error: unknown): error is BaseException {
    return error instanceof BaseException;
  }

  static extractMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

  static extractCode(error: unknown): string | undefined {
    return this.isBaseException(error) ? error.code : undefined;
  }
}
