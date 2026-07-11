import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class SecurityHealthIndicator {
  constructor(
    private readonly configService: AppConfigService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  check(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    const { encryptionKeyHex, enableHsts, enableCsp } = this.configService.security;

    if (!encryptionKeyHex) {
      return indicator.up({
        warning: 'ENCRYPTION_KEY_HEX not set; an ephemeral key was generated at boot',
        hstsEnabled: enableHsts,
        cspEnabled: enableCsp,
      });
    }

    return indicator.up({ hstsEnabled: enableHsts, cspEnabled: enableCsp });
  }
}
