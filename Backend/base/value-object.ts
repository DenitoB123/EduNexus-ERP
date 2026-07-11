/**
 * Base class for Value Objects: immutable, defined entirely by their
 * attributes (no identity), and compared structurally rather than by
 * reference. Future modules should extend this for concepts like
 * Money, Email, Address, DateRange, etc., rather than passing raw
 * primitives around.
 */
export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(other?: ValueObject<TProps>): boolean {
    if (!other || other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  toJSON(): TProps {
    return { ...this.props };
  }
}
