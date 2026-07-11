import { StringUtil } from './string.util';
import { ArrayUtil } from './array.util';
import { ObjectUtil } from './object.util';
import { EncryptionUtil } from './encryption.util';
import { HashingUtil } from './hashing.util';
import { UuidUtil } from './uuid.util';
import { DateUtil } from './date.util';
import { NumberUtil } from './number.util';

describe('StringUtil', () => {
  it('slugifies a string', () => {
    expect(StringUtil.slugify('Hello, World!  Foo')).toBe('hello-world-foo');
  });

  it('truncates with a suffix', () => {
    expect(StringUtil.truncate('abcdefgh', 5)).toBe('ab...');
  });

  it('converts to camelCase and snake_case', () => {
    expect(StringUtil.toCamelCase('hello_world-test')).toBe('helloWorldTest');
    expect(StringUtil.toSnakeCase('helloWorldTest')).toBe('hello_world_test');
  });
});

describe('ArrayUtil', () => {
  it('chunks an array', () => {
    expect(ArrayUtil.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('groups items by a key function', () => {
    const grouped = ArrayUtil.groupBy([{ type: 'a', v: 1 }, { type: 'b', v: 2 }, { type: 'a', v: 3 }], (i) => i.type);
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });

  it('computes intersection and difference', () => {
    expect(ArrayUtil.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(ArrayUtil.difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
  });
});

describe('ObjectUtil', () => {
  it('picks and omits keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(ObjectUtil.pick(obj, ['a', 'b'])).toEqual({ a: 1, b: 2 });
    expect(ObjectUtil.omit(obj, ['a'])).toEqual({ b: 2, c: 3 });
  });

  it('deep merges nested objects', () => {
    const merged = ObjectUtil.deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 99 } });
    expect(merged).toEqual({ a: { x: 1, y: 99 } });
  });
});

describe('EncryptionUtil', () => {
  it('encrypts and decrypts a round trip', () => {
    const key = EncryptionUtil.generateKeyHex();
    const cipherText = EncryptionUtil.encrypt('sensitive data', key);
    expect(EncryptionUtil.decrypt(cipherText, key)).toBe('sensitive data');
  });
});

describe('HashingUtil', () => {
  it('produces a deterministic sha256 hash', () => {
    expect(HashingUtil.sha256('hello')).toBe(HashingUtil.sha256('hello'));
    expect(HashingUtil.sha256('hello')).not.toBe(HashingUtil.sha256('world'));
  });
});

describe('UuidUtil', () => {
  it('generates a valid UUID', () => {
    expect(UuidUtil.isValid(UuidUtil.generate())).toBe(true);
  });

  it('rejects an invalid UUID', () => {
    expect(UuidUtil.isValid('not-a-uuid')).toBe(false);
  });
});

describe('DateUtil', () => {
  it('adds days correctly', () => {
    const result = DateUtil.addDays(new Date('2026-01-01'), 5);
    expect(DateUtil.toIsoDate(result)).toBe('2026-01-06');
  });
});

describe('NumberUtil', () => {
  it('clamps a value within range', () => {
    expect(NumberUtil.clamp(150, 0, 100)).toBe(100);
    expect(NumberUtil.clamp(-10, 0, 100)).toBe(0);
  });
});
