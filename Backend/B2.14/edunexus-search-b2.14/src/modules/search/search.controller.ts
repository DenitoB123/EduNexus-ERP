/**
 * search.controller.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * REST surface for the centralized search platform. Authentication and
 * tenant resolution are assumed to happen upstream (Auth/Multi-tenancy
 * infrastructure, B1.1–B2.2) and populate `request.user`/`request.tenant`
 * — SearchContextGuard below only validates their presence and, for
 * admin-only routes, checks a permission via the injected
 * IPermissionChecker extension point. It intentionally does not
 * reimplement RBAC/auth.
 */

import {
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  Inject,
  Injectable,
  Optional,
  Param,
  Post,
  Query,
  UseGuards,
  createParamDecorator,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { IndexingService } from './indexing/indexing.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestionQueryDto, IndexDocumentDto, BulkIndexDocumentDto } from './dto/index-document.dto';
import { ReindexRequestDto } from './dto/reindex.dto';
import { PERMISSION_CHECKER } from './constants/tokens';
import { IPermissionChecker, ISearchRequestContext, IActorContext, ITenantContext } from './interfaces/infrastructure.interfaces';
import { DEFAULT_RECENT_SEARCHES_LIMIT, DEFAULT_POPULAR_SEARCHES_LIMIT } from './constants/search.constants';
import { ISearchDocument } from './interfaces/search-document.interface';

type SearchDocumentPartial = Omit<ISearchDocument, 'id' | 'indexedAt'>;

// ---------------------------------------------------------------------
// Minimal request contract + guard/decorator (self-contained — this
// milestone does not assume any other module's controller layer exists).
// ---------------------------------------------------------------------

interface ISearchHttpRequest {
  user?: IActorContext;
  tenant?: ITenantContext;
  headers: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
}

const REQUIRE_SEARCH_ADMIN_KEY = 'search:requireAdmin';
export const RequireSearchAdmin = () => SetMetadata(REQUIRE_SEARCH_ADMIN_KEY, true);

@Injectable()
class SearchContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(PERMISSION_CHECKER) private readonly permissionChecker?: IPermissionChecker,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ISearchHttpRequest>();
    if (!request.user || !request.tenant) {
      throw new Error(
        'Search endpoints require an authenticated actor and tenant context on the request, populated upstream by Auth/Multi-tenancy infrastructure.',
      );
    }

    const requiresAdmin = this.reflector.get<boolean>(REQUIRE_SEARCH_ADMIN_KEY, context.getHandler());
    if (requiresAdmin && this.permissionChecker) {
      const allowed = await this.permissionChecker.hasPermission(request.user.userId, 'search.admin', request.user.roles);
      if (!allowed) {
        throw new Error('You do not have permission to perform this search administration action.');
      }
    }
    return true;
  }
}

const CurrentSearchContext = createParamDecorator((_data: unknown, ctx: ExecutionContext): ISearchRequestContext => {
  const request = ctx.switchToHttp().getRequest<ISearchHttpRequest>();
  return {
    actor: request.user as IActorContext,
    tenant: request.tenant as ITenantContext,
    correlationId: (request.headers['x-correlation-id'] as string | undefined) ?? undefined,
  };
});

// ---------------------------------------------------------------------

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(SearchContextGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly indexingService: IndexingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all indexed EduNexus modules' })
  async search(@Query() dto: SearchQueryDto, @CurrentSearchContext() context: ISearchRequestContext) {
    return this.searchService.search(dto, context);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Auto-complete suggestions for a search prefix' })
  async suggest(@Query() dto: SuggestionQueryDto, @CurrentSearchContext() context: ISearchRequestContext) {
    return this.searchService.suggest(dto, context);
  }

  @Get('recent')
  @ApiOperation({ summary: "Current user's recent search terms" })
  async recent(@Query('limit') limit: string | undefined, @CurrentSearchContext() context: ISearchRequestContext) {
    return this.searchService.recentSearches(context, limit ? parseInt(limit, 10) : DEFAULT_RECENT_SEARCHES_LIMIT);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Most popular search terms tenant-wide' })
  async popular(@Query('limit') limit: string | undefined, @CurrentSearchContext() context: ISearchRequestContext) {
    return this.searchService.popularSearches(context, limit ? parseInt(limit, 10) : DEFAULT_POPULAR_SEARCHES_LIMIT);
  }

  @Get('count')
  @ApiOperation({ summary: 'Indexed document count, optionally filtered by entity type' })
  async count(@Query('entityType') entityType: string | undefined, @CurrentSearchContext() context: ISearchRequestContext) {
    return { count: await this.searchService.count(context, entityType) };
  }

  // -----------------------------------------------------------------
  // Administrative indexing endpoints
  // -----------------------------------------------------------------

  @Post('index')
  @RequireSearchAdmin()
  @ApiOperation({ summary: 'Manually index a single document (admin)' })
  async indexOne(@Body() dto: IndexDocumentDto, @CurrentSearchContext() context: ISearchRequestContext) {
    // Admin API trusts the caller to supply a document matching
    // Omit<ISearchDocument, 'id' | 'indexedAt'>; IndexBuilder.buildFromPartial()
    // still validates entityType/entityId and fills in derived defaults.
    await this.indexingService.indexDocument(
      { ...dto.document, entityType: dto.entityType, entityId: dto.entityId } as unknown as SearchDocumentPartial,
      context.actor.userId,
    );
    return { success: true };
  }

  @Post('index/bulk')
  @RequireSearchAdmin()
  @ApiOperation({ summary: 'Manually bulk index documents (admin)' })
  async indexBulk(@Body() dto: BulkIndexDocumentDto, @CurrentSearchContext() context: ISearchRequestContext) {
    const documents = dto.items.map(
      (item) =>
        ({ ...item.document, entityType: item.entityType, entityId: item.entityId }) as unknown as SearchDocumentPartial,
    );
    return this.indexingService.bulkIndex(documents, context.actor.userId);
  }

  @Delete('index/:entityType/:entityId')
  @RequireSearchAdmin()
  @ApiOperation({ summary: 'Remove a single document from the index (admin)' })
  async removeOne(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentSearchContext() context: ISearchRequestContext,
  ) {
    await this.indexingService.removeFromIndex(entityType, entityId, context.tenant.tenantId, context.actor.userId);
    return { success: true };
  }

  @Post('reindex')
  @RequireSearchAdmin()
  @ApiOperation({ summary: 'Trigger a full or entity-scoped reindex (admin)' })
  async reindex(@Body() dto: ReindexRequestDto, @CurrentSearchContext() context: ISearchRequestContext) {
    return this.indexingService.reindex(
      {
        entityType: dto.entityType,
        tenantId: context.tenant.tenantId,
        batchSize: dto.batchSize,
        background: dto.background ?? true,
      },
      context.actor.userId,
    );
  }
}
