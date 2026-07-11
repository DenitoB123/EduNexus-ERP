import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestFixtures } from '../../common/testing/test.fixtures';

export class ApiIntegrationTestFramework {
  constructor(private readonly app: INestApplication) {}

  get(path: string, tenantId: string = TestFixtures.tenantId) {
    return request(this.app.getHttpServer()).get(path).set('x-tenant-id', tenantId);
  }

  post(path: string, body: unknown, tenantId: string = TestFixtures.tenantId) {
    return request(this.app.getHttpServer()).post(path).set('x-tenant-id', tenantId).send(body);
  }

  patch(path: string, body: unknown, tenantId: string = TestFixtures.tenantId) {
    return request(this.app.getHttpServer()).patch(path).set('x-tenant-id', tenantId).send(body);
  }

  delete(path: string, tenantId: string = TestFixtures.tenantId) {
    return request(this.app.getHttpServer()).delete(path).set('x-tenant-id', tenantId);
  }

  withAuth(req: request.Test, token: string): request.Test {
    return req.set('Authorization', `Bearer ${token}`);
  }
}
