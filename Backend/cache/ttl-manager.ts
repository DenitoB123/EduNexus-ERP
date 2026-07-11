export type TtlPolicy = 'short' | 'default' | 'long' | 'session' | 'permanent';

export class TtlManager {
  private static readonly POLICIES: Record<TtlPolicy, number | undefined> = {
    short: 60,
    default: 300,
    long: 3600,
    session: 86400,
    permanent: undefined,
  };

  static resolve(policy: TtlPolicy = 'default'): number | undefined {
    return this.POLICIES[policy];
  }
}
