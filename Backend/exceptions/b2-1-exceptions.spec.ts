import { ExceptionFactory } from './exception.factory';
import { EntityNotFoundException } from './entity-not-found.exception';
import { DuplicateEntityException } from './duplicate-entity.exception';
import { AuthorizationException } from './authorization.exception';
import { TenantException } from './tenant.exception';
import { ConfigurationException } from './configuration.exception';

describe('B2.1 exceptions', () => {
  it('EntityNotFoundException maps to 404', () => {
    const error = ExceptionFactory.entityNotFound('Student', 'abc-123');
    expect(error).toBeInstanceOf(EntityNotFoundException);
    expect(error.getStatus()).toBe(404);
  });

  it('DuplicateEntityException maps to 409', () => {
    const error = ExceptionFactory.duplicateEntity('Student', 'email', 'a@b.com');
    expect(error).toBeInstanceOf(DuplicateEntityException);
    expect(error.getStatus()).toBe(409);
  });

  it('AuthorizationException maps to 403 and includes the resource', () => {
    const error = ExceptionFactory.unauthorizedAction('delete', 'Student');
    expect(error).toBeInstanceOf(AuthorizationException);
    expect(error.getStatus()).toBe(403);
    expect(error.message).toContain('delete');
    expect(error.message).toContain('Student');
  });

  it('TenantException.missingContext produces a 400', () => {
    const error = TenantException.missingContext();
    expect(error.getStatus()).toBe(400);
  });

  it('ConfigurationException.missingEnvVar produces a 500 with the key in the message', () => {
    const error = ConfigurationException.missingEnvVar('DATABASE_URL');
    expect(error.getStatus()).toBe(500);
    expect(error.message).toContain('DATABASE_URL');
  });
});
