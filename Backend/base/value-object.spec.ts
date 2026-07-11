import { ValueObject } from './value-object';

interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends ValueObject<MoneyProps> {
  static create(amount: number, currency: string): Money {
    return new Money({ amount, currency });
  }

  get amount(): number {
    return this.props.amount;
  }
}

describe('ValueObject', () => {
  it('two instances with identical props are equal', () => {
    const a = Money.create(100, 'USD');
    const b = Money.create(100, 'USD');
    expect(a.equals(b)).toBe(true);
  });

  it('instances with different props are not equal', () => {
    const a = Money.create(100, 'USD');
    const b = Money.create(200, 'USD');
    expect(a.equals(b)).toBe(false);
  });

  it('is immutable - props cannot be reassigned', () => {
    const money = Money.create(50, 'EUR');
    expect(() => {
      (money as unknown as { props: MoneyProps }).props.amount = 999;
    }).toThrow();
  });

  it('toJSON returns a plain object copy of the props', () => {
    const money = Money.create(75, 'GBP');
    expect(money.toJSON()).toEqual({ amount: 75, currency: 'GBP' });
  });
});
