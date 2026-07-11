import { TestFixtures } from './test.fixtures';

export class MockRequestBuilder {
  private request: Record<string, unknown> = {
    method: 'GET',
    url: '/test',
    originalUrl: '/test',
    ip: '127.0.0.1',
    headers: {},
    params: {},
    query: {},
    body: {},
    tenantContext: {
      tenantId: TestFixtures.tenantId,
      correlationId: TestFixtures.correlationId,
      actorId: TestFixtures.actorId,
    },
  };

  withMethod(method: string): this {
    this.request.method = method;
    return this;
  }

  withUrl(url: string): this {
    this.request.url = url;
    this.request.originalUrl = url;
    return this;
  }

  withBody(body: unknown): this {
    this.request.body = body;
    return this;
  }

  withQuery(query: Record<string, string>): this {
    this.request.query = query;
    return this;
  }

  withParams(params: Record<string, string>): this {
    this.request.params = params;
    return this;
  }

  withHeader(key: string, value: string): this {
    (this.request.headers as Record<string, string>)[key] = value;
    return this;
  }

  withTenantId(tenantId: string): this {
    (this.request.tenantContext as Record<string, string>).tenantId = tenantId;
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.request };
  }
}
