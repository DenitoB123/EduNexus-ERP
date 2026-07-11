import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { ModuleDiscoveryService } from '../discovery/module-discovery.service';
import { CAPABILITY_MODULE_MAP } from './platform.constants';
import {
  IPlatformMetadataProvider,
  PlatformMetadata,
  PlatformCapabilities,
} from '../interfaces/platform-metadata-provider.interface';
// resolveJsonModule inlines this at compile time — no runtime file path resolution involved.
import packageJson from '../../../package.json';

@Injectable()
export class PlatformMetadataService implements IPlatformMetadataProvider {
  constructor(
    private readonly configService: AppConfigService,
    private readonly moduleDiscovery: ModuleDiscoveryService,
  ) {}

  private buildCapabilities(): PlatformCapabilities {
    const capabilities = {} as PlatformCapabilities;
    for (const [capability, moduleName] of Object.entries(CAPABILITY_MODULE_MAP)) {
      (capabilities as Record<string, boolean>)[capability] = Boolean(this.moduleDiscovery.getModule(moduleName));
    }
    return capabilities;
  }

  getMetadata(): PlatformMetadata {
    const modules = this.moduleDiscovery.listModules();

    return {
      name: this.configService.app.name,
      environment: this.configService.app.nodeEnv,
      build: {
        version: (packageJson as { version?: string }).version ?? '0.0.0',
        commitSha: process.env.BUILD_SHA,
        builtAt: process.env.BUILD_TIME,
        nodeVersion: process.version,
      },
      capabilities: this.buildCapabilities(),
      installedModules: modules.map((m) => ({
        name: m.name,
        providerCount: m.providerCount,
        controllerCount: m.controllerCount,
      })),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
