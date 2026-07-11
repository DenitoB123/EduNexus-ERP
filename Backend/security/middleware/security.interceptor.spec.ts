import { of, throwError } from 'rxjs';
import { SecurityInterceptor } from './security.interceptor';
import { ForbiddenException } from '../../common/exceptions/forbidden.exception';

describe('SecurityInterceptor', () => {
  let suspiciousActivityLoggerMock: { inspectRequestBody: jest.Mock };
  let responseSanitizerMock: { maskSensitiveFields: jest.Mock };
  let auditLoggerMock: { log: jest.Mock; suspicious: jest.Mock; rateLimitExceeded: jest.Mock };
  let interceptor: SecurityInterceptor;

  const makeContext = (body = {}) => ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ ip: '127.0.0.1', body, headers: {} }),
    }),
  });

  beforeEach(() => {
    suspiciousActivityLoggerMock = { inspectRequestBody: jest.fn() };
    responseSanitizerMock = { maskSensitiveFields: jest.fn((x) => x) };
    auditLoggerMock = { log: jest.fn(), suspicious: jest.fn(), rateLimitExceeded: jest.fn() };

    interceptor = new SecurityInterceptor(
      suspiciousActivityLoggerMock as never,
      responseSanitizerMock as never,
      auditLoggerMock as never,
    );
  });

  it('passes through clean responses, sanitizing the data', (done) => {
    const data = { name: 'Alice', password: 'secret' };
    const handler = { handle: () => of(data) };

    interceptor.intercept(makeContext() as never, handler as never).subscribe((result) => {
      expect(responseSanitizerMock.maskSensitiveFields).toHaveBeenCalledWith(data);
      done();
    });
  });

  it('emits audit log on FORBIDDEN exception via catchError', (done) => {
    const error = new ForbiddenException();
    const handler = { handle: () => throwError(() => error) };

    interceptor.intercept(makeContext() as never, handler as never).subscribe({
      error: () => {
        expect(auditLoggerMock.log).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'PERMISSION_DENIED' }),
        );
        done();
      },
    });
  });

  it('inspects request body on every request', () => {
    const body = { name: 'test' };
    const handler = { handle: () => of({}) };

    interceptor.intercept(makeContext(body) as never, handler as never).subscribe();

    expect(suspiciousActivityLoggerMock.inspectRequestBody).toHaveBeenCalled();
  });
});
