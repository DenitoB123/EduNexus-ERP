export type EnvironmentProfile = 'development' | 'staging' | 'production' | 'test';

/**
 * Deliberately separate from common/utils/environment.util.ts, which
 * only reads raw process.env values — this operates one level higher,
 * on the already-parsed AppConfigService.app.nodeEnv, and encodes
 * *policy* (what each profile means for the platform) rather than
 * variable parsing.
 */
export class ConfigProfileUtil {
  static isProduction(nodeEnv: string): boolean {
    return nodeEnv === 'production';
  }

  static isDevelopment(nodeEnv: string): boolean {
    return nodeEnv === 'development';
  }

  static isTest(nodeEnv: string): boolean {
    return nodeEnv === 'test';
  }

  static isStaging(nodeEnv: string): boolean {
    return nodeEnv === 'staging';
  }

  /** Whether verbose diagnostics (stack traces, config dumps, debug logs) are safe to expose for this profile. */
  static allowsVerboseDiagnostics(nodeEnv: string): boolean {
    return nodeEnv !== 'production';
  }
}
