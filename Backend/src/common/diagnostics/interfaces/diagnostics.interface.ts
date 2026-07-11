export interface ExceptionDiagnostic {
  message: string;
  name: string;
  stack?: string;
  correlationId?: string;
  occurredAt: string;
  context?: Record<string, unknown>;
}

export interface DependencyDiagnostic {
  name: string;
  reachable: boolean;
  latencyMs?: number;
  detail?: string;
}

export interface ConfigurationDiagnostic {
  key: string;
  present: boolean;
  usingDefault: boolean;
  note?: string;
}

export interface ModuleDiagnostic {
  module: string;
  status: 'ok' | 'degraded' | 'error';
  detail?: string;
}

export interface PerformanceDiagnostic {
  endpoint: string;
  averageDurationMs: number;
  maxDurationMs: number;
  requestCount: number;
  flagged: boolean;
  reason?: string;
}

export interface DiagnosticsReport {
  exceptions: ExceptionDiagnostic[];
  dependencies: DependencyDiagnostic[];
  configuration: ConfigurationDiagnostic[];
  modules: ModuleDiagnostic[];
  performance: PerformanceDiagnostic[];
  generatedAt: string;
}

export interface IDiagnosticsService {
  captureException(error: Error, context?: Record<string, unknown>, correlationId?: string): void;
  runFullDiagnostics(): Promise<DiagnosticsReport>;
}
