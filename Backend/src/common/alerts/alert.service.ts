import { Inject, Injectable } from '@nestjs/common';
import { Alert, AlertRule, ALERT_CHANNELS, IAlertChannel, IAlertService } from './interfaces/alert.interface';
import { AppLoggerService } from '../logger/app-logger.service';

const MAX_RECENT_ALERTS = 200;

@Injectable()
export class AlertService implements IAlertService {
  private readonly rules = new Map<string, AlertRule>();
  private readonly lastFiredAt = new Map<string, number>();
  private readonly recentAlerts: Alert[] = [];

  constructor(
    @Inject(ALERT_CHANNELS) private readonly channels: IAlertChannel[],
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AlertService.name);
  }

  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  async evaluateAll(): Promise<Alert[]> {
    const fired: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (this.isInCooldown(rule)) continue;

      let outcome: Awaited<ReturnType<AlertRule['evaluate']>>;
      try {
        outcome = await rule.evaluate();
      } catch (error) {
        this.logger.error(`Alert rule "${rule.id}" threw during evaluation: ${(error as Error).message}`);
        continue;
      }

      if (!outcome) continue;

      const alert: Alert = { ruleId: rule.id, firedAt: new Date().toISOString(), ...outcome };
      await this.fire(alert);
      fired.push(alert);
      this.lastFiredAt.set(rule.id, Date.now());
    }

    return fired;
  }

  getRecentAlerts(): Alert[] {
    return [...this.recentAlerts];
  }

  private isInCooldown(rule: AlertRule): boolean {
    const last = this.lastFiredAt.get(rule.id);
    return last !== undefined && Date.now() - last < rule.cooldownMs;
  }

  private async fire(alert: Alert): Promise<void> {
    this.recentAlerts.push(alert);
    if (this.recentAlerts.length > MAX_RECENT_ALERTS) this.recentAlerts.shift();

    await Promise.all(
      this.channels.map((channel) =>
        channel.send(alert).catch((error: unknown) => {
          this.logger.error(
            `Alert channel "${channel.name}" failed to deliver alert "${alert.ruleId}": ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }),
      ),
    );
  }
}
