import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { MockRequestBuilder } from '../../common/testing/mock-request.builder';

export class ApiTestHelpers {
  static createMockExecutionContext(requestOverrides: Record<string, unknown> = {}): ExecutionContext {
    const request = { ...new MockRequestBuilder().build(), ...requestOverrides };
    const response = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };

    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => class {},
    } as unknown as ExecutionContext;
  }

  static createMockCallHandler(returnValue: unknown): CallHandler {
    return { handle: () => of(returnValue) };
  }
}
