/**
 * mapping.module.ts
 *
 * B2.6 — Enterprise Object Mapping, Serialization & Transformation
 * Framework. This module is the single place business modules import to
 * get SerializationService, TransformationService, MappingProfileRegistry,
 * and the import/export converters via DI, rather than instantiating them
 * ad hoc. Static mapper classes (BaseMapper, DomainMapper, PaginatedMapper,
 * CollectionMapper, ObjectMapper, EntityMapper, DtoMapper, ResponseMapper)
 * are not providers -- they're base classes / static utilities meant to be
 * extended or called directly, consistent with how ObjectMapper/DtoMapper/
 * ResponseMapper already work in this project (B2.2).
 *
 * @Global() -- mapping/serialization is cross-cutting infrastructure every
 * future business module needs, the same category as logging or config,
 * so it is registered once at the root and does not need re-importing
 * into every feature module.
 */

import { Global, Module, OnModuleInit } from '@nestjs/common';
import { SerializationService } from '../serializers/serialization.service';
import { TransformationService } from '../transformers/transformation.service';
import { MappingProfileRegistry } from '../profiles/mapping-profile.registry';
import { DEFAULT_PROFILES } from '../profiles/default-profiles';
import { CsvConverter } from '../converters/csv.converter';
import { ExcelConverter } from '../converters/excel.converter';
import { JsonConverter } from '../converters/json.converter';
import { XmlConverter } from '../converters/xml.converter';
import { PdfMetadataPreparer } from '../converters/pdf-metadata.preparer';

@Global()
@Module({
  providers: [
    SerializationService,
    TransformationService,
    MappingProfileRegistry,
    CsvConverter,
    ExcelConverter,
    JsonConverter,
    XmlConverter,
    PdfMetadataPreparer,
  ],
  exports: [
    SerializationService,
    TransformationService,
    MappingProfileRegistry,
    CsvConverter,
    ExcelConverter,
    JsonConverter,
    XmlConverter,
    PdfMetadataPreparer,
  ],
})
export class MappingModule implements OnModuleInit {
  constructor(private readonly profileRegistry: MappingProfileRegistry) {}

  onModuleInit(): void {
    // Placeholder profiles only (see profiles/default-profiles.ts header) --
    // real business modules should call profileRegistry.registerProfile(...)
    // with their own profile once real entities/DTOs exist.
    this.profileRegistry.registerAll(DEFAULT_PROFILES);
  }
}
