import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import { ConfigurationValidatorService } from '../validation/configuration-validator.service';
import { StartupVerifierService } from '../startup/startup-verifier.service';
import { PlatformMetadataService } from '../platform/platform-metadata.service';
import { ConfigurationValidationException } from '../exceptions/configuration-validation.exception';
import { ConfigurationValidationResult } from '../interfaces/configuration-validator.interface';
import { StartupVerificationReport } from '../interfaces/startup-verifier.interface';
import { PlatformMetadata } from '../interfaces/platform-metadata-provider.interface';

export interface BootstrapDiagnosticsReport {
  configuration: ConfigurationValidationResult;
  startup: StartupVerificationReport;
  platform: PlatformMetadata;
}

/**
 * The single call main.ts makes before app.listen(). Composes the
 * three platform diagnostics services into one report, logs a concise
 * summary, and throws (aborting boot) only if configuration validation
 * produced a hard error — a down *critical* dependency is logged loudly
 * but does not prevent boot, matching how Kubernetes-style readiness
 * probes are meant to work (the process starts; /health/ready reports
 * unready until dependencies recover, instead of crash-looping).
 */
@Injectable()
export class BootstrapDiagnosticsService {
  constructor(
    private readonly configValidator: ConfigurationValidatorService,
    private readonly startupVerifier: StartupVerifierService,
    private readonly platformMetadata: PlatformMetadataService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('BootstrapDiagnosticsService');
  }

  async runAndLog(): Promise<BootstrapDiagnosticsReport> {
    const configuration = this.configValidator.validate();
    for (const issue of configuration.issues) {
      const line = `Configuration issue [${issue.key}]: ${issue.message}`;
      if (issue.severity === 'error') this.logger.error(line);
      else this.logger.warn(line);
    }

    const startup = await this.startupVerifier.verify();
    const platform = this.platformMetadata.getMetadata();

    this.logger.log(
      `Platform "${platform.name}" v${platform.build.version} — ${platform.installedModules.length} module(s) loaded, ` +
        `${startup.checks.filter((c) => c.status === 'up').length}/${startup.checks.length} startup checks passing`,
    );

    if (!configuration.valid) {
      const errorIssues = configuration.issues.filter((i) => i.severity === 'error');
      throw new ConfigurationValidationException(
        `Configuration validation failed with ${errorIssues.length} error(s)`,
        errorIssues,
      );
    }

    return { configuration, startup, platform };
  }
}
