import { AggregateRoot } from './aggregate-root';
import { DomainEvent } from './domain-event';

class StudentEnrolledEvent extends DomainEvent {
  constructor(public readonly studentId: string) {
    super('student.enrolled');
  }
}

class TestAggregate extends AggregateRoot {
  enroll(): void {
    this.addDomainEvent(new StudentEnrolledEvent(this.id));
  }
}

describe('AggregateRoot', () => {
  it('starts with no uncommitted events', () => {
    const aggregate = new TestAggregate();
    expect(aggregate.getUncommittedEvents()).toEqual([]);
  });

  it('accumulates domain events raised via addDomainEvent', () => {
    const aggregate = new TestAggregate();
    aggregate.enroll();
    aggregate.enroll();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(2);
    expect(events[0].eventName).toBe('student.enrolled');
  });

  it('clearUncommittedEvents empties the event list', () => {
    const aggregate = new TestAggregate();
    aggregate.enroll();
    aggregate.clearUncommittedEvents();

    expect(aggregate.getUncommittedEvents()).toEqual([]);
  });

  it('getUncommittedEvents returns a defensive copy', () => {
    const aggregate = new TestAggregate();
    aggregate.enroll();

    const events = aggregate.getUncommittedEvents();
    events.pop();

    expect(aggregate.getUncommittedEvents()).toHaveLength(1);
  });
});
