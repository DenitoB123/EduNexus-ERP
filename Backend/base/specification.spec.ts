import { Specification } from './specification';

interface Product {
  price: number;
  category: string;
}

class PriceAboveSpec extends Specification<Product> {
  constructor(private readonly threshold: number) {
    super();
  }

  isSatisfiedBy(candidate: Product): boolean {
    return candidate.price > this.threshold;
  }

  toQuery(): Record<string, unknown> {
    return { price: { gt: this.threshold } };
  }
}

class CategoryIsSpec extends Specification<Product> {
  constructor(private readonly category: string) {
    super();
  }

  isSatisfiedBy(candidate: Product): boolean {
    return candidate.category === this.category;
  }

  toQuery(): Record<string, unknown> {
    return { category: this.category };
  }
}

describe('Specification', () => {
  const expensive = new PriceAboveSpec(100);
  const isBooks = new CategoryIsSpec('books');

  it('evaluates a single specification correctly', () => {
    expect(expensive.isSatisfiedBy({ price: 150, category: 'books' })).toBe(true);
    expect(expensive.isSatisfiedBy({ price: 50, category: 'books' })).toBe(false);
  });

  it('combines specifications with AND', () => {
    const combined = expensive.and(isBooks);
    expect(combined.isSatisfiedBy({ price: 150, category: 'books' })).toBe(true);
    expect(combined.isSatisfiedBy({ price: 150, category: 'toys' })).toBe(false);
    expect(combined.toQuery()).toEqual({
      AND: [{ price: { gt: 100 } }, { category: 'books' }],
    });
  });

  it('combines specifications with OR', () => {
    const combined = expensive.or(isBooks);
    expect(combined.isSatisfiedBy({ price: 10, category: 'books' })).toBe(true);
    expect(combined.isSatisfiedBy({ price: 10, category: 'toys' })).toBe(false);
  });

  it('negates a specification with NOT', () => {
    const notExpensive = expensive.not();
    expect(notExpensive.isSatisfiedBy({ price: 10, category: 'books' })).toBe(true);
    expect(notExpensive.toQuery()).toEqual({ NOT: { price: { gt: 100 } } });
  });
});
