import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { DocumentsService } from './documents.service';
import { DocumentTemplateService } from './templates/document-template.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from './dto/document-template.dto';
import { DocumentGenerationQueryDto } from './dto/document-generation-query.dto';
import { DocumentPermission } from './constants/documents.constants';

/**
 * JwtAuthGuard applies globally (APP_GUARD in app.module.ts); only
 * PermissionsGuard is declared here, matching
 * modules/reporting/reporting.controller.ts's exact guard pattern.
 */
@Controller('documents')
@UseGuards(PermissionsGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly templateService: DocumentTemplateService,
  ) {}

  @Post('generate')
  @RequirePermissions(DocumentPermission.GENERATE)
  generate(@Body() dto: GenerateDocumentDto, @CurrentTenant() tenantId: string, @CurrentUser() actorId?: string) {
    return this.documentsService.generate(tenantId, actorId, dto);
  }

  @Get('generations')
  @RequirePermissions(DocumentPermission.READ)
  listGenerations(@Query() query: DocumentGenerationQueryDto, @CurrentTenant() tenantId: string) {
    return this.documentsService.listGenerations(tenantId, query);
  }

  @Get('generations/:id')
  @RequirePermissions(DocumentPermission.READ)
  getGeneration(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.documentsService.getGeneration(id, tenantId);
  }

  @Get('generations/:id/download')
  @RequirePermissions(DocumentPermission.READ)
  getDownloadUrl(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.documentsService.getDownloadUrl(id, tenantId);
  }

  @Post('templates')
  @RequirePermissions(DocumentPermission.MANAGE_TEMPLATES)
  createTemplate(@Body() dto: CreateDocumentTemplateDto, @CurrentTenant() tenantId: string, @CurrentUser() actorId?: string) {
    return this.templateService.create(tenantId, actorId, dto);
  }

  @Post('templates/:id')
  @RequirePermissions(DocumentPermission.MANAGE_TEMPLATES)
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentTemplateDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() actorId?: string,
  ) {
    return this.templateService.update(id, tenantId, actorId, dto);
  }

  @Get('templates')
  @RequirePermissions(DocumentPermission.MANAGE_TEMPLATES)
  listTemplates(@CurrentTenant() tenantId: string) {
    return this.templateService.list(tenantId);
  }

  @Get('templates/:id')
  @RequirePermissions(DocumentPermission.MANAGE_TEMPLATES)
  getTemplate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.templateService.findById(id, tenantId);
  }
}
