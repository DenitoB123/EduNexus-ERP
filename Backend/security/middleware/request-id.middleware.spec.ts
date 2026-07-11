import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  const middleware = new RequestIdMiddleware();

  it('stamps a new request id when none is present', () => {
    const req = { headers: {} } as never;
    const res = { setHeader: jest.fn() } as never;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect((req as Record<string, unknown>).headers['x-request-id']).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('preserves an existing request id', () => {
    const existing = 'existing-id-123';
    const req = { headers: { 'x-request-id': existing } } as never;
    const res = { setHeader: jest.fn() } as never;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect((req as Record<string, never>).headers['x-request-id']).toBe(existing);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', existing);
  });
});
