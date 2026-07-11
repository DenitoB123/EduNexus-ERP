import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { PlatformMetadataService } from './platform-metadata.service';
import { ModuleRegistryService } from '../registry/module-registry.service';
import { FeatureRegistryService } from '../registry/feature-registry.service';
import { ConfigurationValidatorService } from '../validation/configuration-validator.service';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformMetadataService: PlatformMetadataService,
    private readonly moduleRegistry: ModuleRegistryService,
    private readonly featureRegistry: FeatureRegistryService,
    private readonly configValidator: ConfigurationValidatorService,
  ) {}

  @Public()
  @Get('metadata')
  @ApiOperation({
    summary: 'Platform metadata',
    description: 'Version, build info, capabilities, and installed module summary for this deployment.',
  })
  getMetadata() {
    return this.platformMetadataService.getMetadata();
  }

  @Public()
  @Get('modules')
  @ApiOperation({
    summary: 'Registered modules',
    description: 'Every NestJS module currently loaded, with provider/controller counts and import relationships.',
  })
  listModules() {
    return this.moduleRegistry.listModules();
  }

  @Public()
  @Get('dependency-graph')
  @ApiOperation({
    summary: 'Module dependency graph',
    description: 'Nodes and edges describing which modules import which, plus circular-dependency detection.',
  })
  getDependencyGraph() {
    const graph = this.moduleRegistry.getDependencyGraph();
    const cycles = this.moduleRegistry.checkForCircularDependencies();
    return { ...graph, ...cycles };
  }

  @Public()
  @Get('features')
  @ApiOperation({
    summary: 'Registered features',
    description: 'Business modules, plugins, extensions, and integrations registered via FeatureRegistryService.',
  })
  listFeatures() {
    return this.featureRegistry.list();
  }

  @Public()
  @Get('configuration/validate')
  @ApiOperation({
    summary: 'Configuration validation report',
    description: 'Cross-field configuration checks beyond the startup Joi schema (see ConfigurationValidatorService).',
  })
  validateConfiguration() {
    return this.configValidator.validate();
  }
}
