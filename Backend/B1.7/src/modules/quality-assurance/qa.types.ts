export interface QaCheckResult {
  checkName: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  issuesFound: number;
  details?: Record<string, unknown>;
}

export interface QaCheck {
  readonly name: string;
  run(): Promise<QaCheckResult>;
}
