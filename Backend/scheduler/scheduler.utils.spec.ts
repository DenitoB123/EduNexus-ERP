import { SchedulerUtils } from './scheduler.utils';

describe('SchedulerUtils', () => {
  it('validates a standard 5-field cron expression', () => {
    expect(SchedulerUtils.isValidCronExpression('*/5 * * * *')).toBe(true);
  });

  it('validates a 6-field cron expression with seconds', () => {
    expect(SchedulerUtils.isValidCronExpression('0 */5 * * * *')).toBe(true);
  });

  it('rejects an expression with too few fields', () => {
    expect(SchedulerUtils.isValidCronExpression('* * *')).toBe(false);
  });

  it('rejects an expression with invalid characters', () => {
    expect(SchedulerUtils.isValidCronExpression('a b c d e')).toBe(false);
  });

  it('computes ms until a future date, clamped at 0', () => {
    const future = new Date(Date.now() + 5000);
    expect(SchedulerUtils.msUntil(future)).toBeGreaterThan(0);

    const past = new Date(Date.now() - 5000);
    expect(SchedulerUtils.msUntil(past)).toBe(0);
  });
});
