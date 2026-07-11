import { BadRequestException } from '@nestjs/common';
import { TrimPipe } from './trim.pipe';
import { ParseUuidArrayPipe } from './parse-uuid-array.pipe';

describe('TrimPipe', () => {
  const pipe = new TrimPipe();

  it('trims top-level string values', () => {
    expect(pipe.transform('  hello  ')).toBe('hello');
  });

  it('trims strings recursively inside objects and arrays', () => {
    const result = pipe.transform({ name: '  Alice  ', tags: [' a ', ' b '] });
    expect(result).toEqual({ name: 'Alice', tags: ['a', 'b'] });
  });

  it('leaves non-string values untouched', () => {
    expect(pipe.transform({ age: 30, active: true })).toEqual({ age: 30, active: true });
  });
});

describe('ParseUuidArrayPipe', () => {
  const pipe = new ParseUuidArrayPipe();

  it('parses a comma-separated list of valid UUIDs', () => {
    const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
    const uuid2 = '223e4567-e89b-12d3-a456-426614174001';
    expect(pipe.transform(`${uuid1},${uuid2}`)).toEqual([uuid1, uuid2]);
  });

  it('returns an empty array for an empty string', () => {
    expect(pipe.transform('')).toEqual([]);
  });

  it('throws BadRequestException for invalid UUIDs', () => {
    expect(() => pipe.transform('not-a-uuid,also-bad')).toThrow(BadRequestException);
  });
});
