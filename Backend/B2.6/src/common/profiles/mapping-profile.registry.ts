/**
 * mapping-profile.registry.ts
 */

import { Injectable, Logger } from '@nestjs/common';
import { TransformationService } from '../transformers/transformation.service';
import { IMappingProfile } from './mapping-profile.interface';

@Injectable()
export class MappingProfileRegistry {
  private readonly logger = new Logger(MappingProfileRegistry.name);
  private readonly registered = new Set<string>();

  constructor(private readonly transformationService: TransformationService) {}

  registerProfile(profile: IMappingProfile): void {
    if (this.registered.has(profile.name)) {
      this.logger.warn(`Mapping profile "${profile.name}" is already registered -- skipping duplicate registration.`);
      return;
    }
    profile.register(this.transformationService);
    this.registered.add(profile.name);
    this.logger.log(`Registered mapping profile: ${profile.name}`);
  }

  registerAll(profiles: IMappingProfile[]): void {
    for (const profile of profiles) this.registerProfile(profile);
  }

  isRegistered(name: string): boolean {
    return this.registered.has(name);
  }
}
