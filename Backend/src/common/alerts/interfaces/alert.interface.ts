export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  ruleId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  firedAt: string;
  details?: Record<string, unknown>;
}

export interface IAlertChannel {
  readonly name: string;
  send(alert: Alert): Promise<void>;
}

export interface AlertRule {
  id: string;
  title: string;
  severity: AlertSeverity;
  /** Cooldown before the same rule can fire again, preventing alert storms from a single sustained condition. */
  cooldownMs: number;
  /** Returns an Alert if the condition is currently breached, or null if healthy. */
  evaluate(): Promise<Omit<Alert, 'ruleId' | 'firedAt'> | null>;
}

export interface IAlertService {
  registerRule(rule: AlertRule): void;
  evaluateAll(): Promise<Alert[]>;
  getRecentAlerts(): Alert[];
}

export const ALERT_CHANNELS = 'ALERT_CHANNELS';
