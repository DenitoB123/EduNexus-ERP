import { Global, Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformMetadataService } from './platform-metadata.service';

import { ModuleDiscoveryService } from '../discovery/module-discovery.service';
import { DependencyGraphBuilder } from '../discovery/dependency-graph.builder';

import { ModuleRegistryService } from '../registry/module-registry.service';
import { ProviderRegistryService } from '../registry/provider-registry.service';
import { FeatureRegistryService } from '../registry/feature-registry.service';

import { ConfigurationValidatorService } from '../validation/configuration-validator.service';

import { StartupVerifierService } from '../startup/startup-verifier.service';

import { BootstrapDiagnosticsService } from '../bootstrap/bootstrap-diagnostics.service';

import { HealthModule } from '../../health/health.module';

/**
 * B2.20 — Enterprise Backend Foundation Finalization & Shared
 * Infrastructure Completion.
 *
 * @Global so ModuleRegistryService/FeatureRegistryService/
 * PlatformMetadataService (the pieces future business modules are
 * expected to depend on — see IMPLEMENTATION_SUMMARY_B2_20.md §6) are
 * available anywhere via constructor injection without every module
 * having to import PlatformModule explicitly, matching the existing
 * convention set by CommonModule/AppConfigModule/AppLoggerModule.
 *
 * Imports HealthModule only for the concrete health-indicator
 * providers StartupVerifierService composes (PrismaHealthIndicator,
 * RedisHealthIndicator, RabbitMQHealthIndicator). HealthModule now
 * exports these three (a one-line addition — see IMPLEMENTATION_SUMMARY_B2_20.md
 * §4 "Files Modified" — they were previously only usable inside
 * HealthController). QueueHealthIndicator/StorageHealthIndicator come
 * from InfrastructureMonitoringModule, which is already @Global and
 * already exports them, so no import is needed for those two.
 */
@Global()
@Module({
  imports: [HealthModule],
  controllers: [PlatformController],
  providers: [
    ModuleDiscoveryService,
    DependencyGraphBuilder,

    ModuleRegistryService,
    ProviderRegistryService,
    FeatureRegistryService,

    ConfigurationValidatorService,

    StartupVerifierService,

    PlatformMetadataService,
    BootstrapDiagnosticsService,
  ],
  exports: [
    ModuleDiscoveryService,
    ModuleRegistryService,
    ProviderRegistryService,
    FeatureRegistryService,
    ConfigurationValidatorService,
    StartupVerifierService,
    PlatformMetadataService,
    BootstrapDiagnosticsService,
  ],
})
export class PlatformModule {}
