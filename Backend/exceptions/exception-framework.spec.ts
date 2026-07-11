import { ExceptionFactory } from './exception.factory';
import { ExceptionUtilities } from './exception.utilities';
import { ResourceNotFoundException } from './resource-not-found.exception';

describe('ExceptionFactory', () => {
  it('builds a ResourceNotFoundException via notFound()', () => {
    const error = ExceptionFactory.notFound('Student', 'abc-123');
    expect(error).toBeInstanceOf(ResourceNotFoundException);
    expect(error.getStatus()).toBe(404);
  });

  it('builds a conflict exception with status 409', () => {
    const error = ExceptionFactory.conflict('Duplicate entry');
    expect(error.getStatus()).toBe(409);
  });
});

describe('ExceptionUtilities', () => {
  it('identifies BaseException instances', () => {
    const error = ExceptionFactory.business('bad request');
    expect(ExceptionUtilities.isBaseException(error)).toBe(true);
  });

  it('extracts the error code from a BaseException', () => {
    const error = ExceptionFactory.forbidden();
    expect(ExceptionUtilities.extractCode(error)).toBe('FORBIDDEN');
  });

  it('returns undefined code for a plain Error', () => {
    expect(ExceptionUtilities.extractCode(new Error('plain'))).toBeUndefined();
  });
});
