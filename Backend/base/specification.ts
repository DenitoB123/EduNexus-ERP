export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
  toQuery(): Record<string, unknown>;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}

/**
 * Base class for the Specification pattern: encapsulates a single
 * business rule as an object that can (a) test an in-memory instance
 * via `isSatisfiedBy`, and (b) produce a Prisma-compatible `where`
 * fragment via `toQuery` for pushing the same rule down to the
 * database. Concrete specifications only need to implement both
 * methods once; composition (and/or/not) is provided here.
 */
export abstract class Specification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  abstract toQuery(): Record<string, unknown>;

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }

  toQuery(): Record<string, unknown> {
    return { AND: [this.left.toQuery(), this.right.toQuery()] };
  }
}

class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }

  toQuery(): Record<string, unknown> {
    return { OR: [this.left.toQuery(), this.right.toQuery()] };
  }
}

class NotSpecification<T> extends Specification<T> {
  constructor(private readonly inner: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }

  toQuery(): Record<string, unknown> {
    return { NOT: this.inner.toQuery() };
  }
}
