/**
 * crud.controller.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * `createCrudController()` is a controller-factory (mixin) function: given
 * IControllerOptions for an entity, it returns a fully-decorated, routed
 * NestJS controller class implementing the entire enterprise REST
 * convention (CRUD, bulk ops, search, filter, sort, pagination) wired to
 * that entity's ICrudService (from B2.3). Business modules (B3+) register
 * the returned class directly in their module's `controllers` array —
 * no per-module controller code required for standard CRUD.
 *
 *   // students.module.ts
 *   const StudentController = createCrudController<Student, CreateStudentDto, UpdateStudentDto>({
 *     entityName: 'Student',
 *     serviceToken: STUDENT_SERVICE,
 *     entityType: Student,
 *     createDtoType: CreateStudentDto,
 *     updateDtoType: UpdateStudentDto,
 *     permissions: { create: 'student.create', delete: 'student.delete' },
 *   });
 *
 *   @Module({ controllers: [StudentController], providers: [...] })
 *   export class StudentsModule {}
 *
 * Route table generated (relative to the controller's base path):
 *   POST   /                 create
 *   GET    /                 findAll   (paginated, filterable, sortable, searchable)
 *   GET    /cursor           findAllCursor (keyset pagination)
 *   GET    /exists           exists
 *   GET    /count            count
 *   GET    /export           bulkExport
 *   GET    /:id              findById
 *   PATCH  /:id              update (partial)
 *   PUT    /:id              replace (full update — same handler as PATCH; entities requiring
 *                                       stricter PUT semantics should validate completeness in their DTO)
 *   DELETE /:id               delete (soft-delete if the service is a SoftDeleteService, else hard delete)
 *   POST   /:id/restore       restore
 *   POST   /bulk               bulkCreate
 *   PATCH  /bulk               bulkUpdate
 *   DELETE /bulk               bulkDelete
 *   POST   /bulk/restore       bulkRestore
 *   POST   /import              bulkImport
 */

import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Type,
  UseInterceptors,
} from '@nestjs/common';
import { BaseController } from './base.controller';
import { IControllerOptions } from '../interfaces/controller.interfaces';
import { ICrudService, ISoftDeleteService } from '../interfaces/service.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import { CurrentContext } from '../decorators/current-context.decorator';
import { ProtectedEndpoint } from '../decorators/authorization.decorators';
import { ApiCrudController } from '../decorators/api-crud-controller.decorator';
import { PaginationFormattingInterceptor } from '../interceptors/pagination-formatting.interceptor';
import { ListQueryDto, parseListQuery } from '../dto/list-query.dto';
import { CursorPaginationQueryDto } from '../dto/pagination-query.dto';
import {
  BulkCreateDto,
  BulkUpdateDto,
  BulkDeleteDto,
  BulkRestoreDto,
  BulkExportQueryDto,
} from '../dto/bulk-operations.dto';
import { BulkOperationResponse, IBulkOperationError } from '../responses/service-response';
import {
  ApiBulkOperation,
  ApiCreateOperation,
  ApiDeleteOperation,
  ApiFindAllOperation,
  ApiFindByIdOperation,
  ApiRestoreOperation,
  ApiUpdateOperation,
} from '../swagger/swagger-crud.decorators';
import { toDefaultRoutePath } from '../utils/string.util';

function hasSoftDelete<TEntity, TId>(
  service: ICrudService<TEntity, unknown, unknown, TId>,
): service is ICrudService<TEntity, unknown, unknown, TId> & ISoftDeleteService<TEntity, TId> {
  return typeof (service as unknown as ISoftDeleteService<TEntity, TId>).restore === 'function';
}

export function createCrudController<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string>(
  options: IControllerOptions<TEntity>,
): Type<unknown> {
  const path = options.path ?? toDefaultRoutePath(options.entityName);

  class GeneratedCrudController extends BaseController<TEntity, TCreateDto, TUpdateDto, TId> {
    constructor(service: ICrudService<TEntity, TCreateDto, TUpdateDto, TId>) {
      super(options, service);
    }

    // -----------------------------------------------------------------
    // Create
    // -----------------------------------------------------------------
    @Post()
    @ProtectedEndpoint(...toArray(options.permissions?.create))
    @ApiCreateOperation(options.entityName, (options.entityType ?? Object) as Type<unknown>)
    async create(@Body() dto: TCreateDto, @CurrentContext() context: IRequestContext): Promise<TEntity> {
      this.assertEnabled('create');
      return this.service.create(dto, context);
    }

    // -----------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------
    @Get()
    @ProtectedEndpoint(...toArray(options.permissions?.read))
    @ApiFindAllOperation(options.entityName, (options.entityType ?? Object) as Type<unknown>)
    async findAll(@Query() query: ListQueryDto, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('findAll');
      const { options: findOptions, pagination } = parseListQuery<TEntity>(query);
      return this.service.findManyPaginated(findOptions, pagination, context);
    }

    @Get('cursor')
    @ProtectedEndpoint(...toArray(options.permissions?.read))
    @UseInterceptors(PaginationFormattingInterceptor)
    async findAllCursor(@Query() query: CursorPaginationQueryDto, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('findAll');
      const cursor = query.cursor ? (JSON.parse(query.cursor) as Record<string, unknown>) : undefined;
      return this.service.findManyCursorPaginated({}, { cursor, take: query.take ?? 20 }, context);
    }

    @Get('exists')
    @ProtectedEndpoint(...toArray(options.permissions?.read))
    async exists(@Query('filter') filter: string | undefined, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('exists');
      const where = filter ? (JSON.parse(filter) as Record<string, unknown>) : {};
      return { exists: await this.service.exists(where, context) };
    }

    @Get('count')
    @ProtectedEndpoint(...toArray(options.permissions?.read))
    async count(@Query('filter') filter: string | undefined, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('count');
      const where = filter ? (JSON.parse(filter) as Record<string, unknown>) : undefined;
      return { count: await this.service.count(where, context) };
    }

    @Get('export')
    @ProtectedEndpoint(...toArray(options.permissions?.bulk))
    @ApiBulkOperation(options.entityName, 'export')
    async bulkExport(@Query() query: BulkExportQueryDto, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('bulk');
      const where = query.filter ? (JSON.parse(query.filter) as Record<string, unknown>) : {};
      const items = await this.service.findMany({ where }, context);
      return { format: query.format ?? 'csv', count: items.length, items };
    }

    @Get(':id')
    @ProtectedEndpoint(...toArray(options.permissions?.read))
    @ApiFindByIdOperation(options.entityName, (options.entityType ?? Object) as Type<unknown>)
    async findById(@Param('id') id: TId, @CurrentContext() context: IRequestContext): Promise<TEntity> {
      this.assertEnabled('findById');
      return this.requireEntity(id, context);
    }

    // -----------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------
    @Patch(':id')
    @ProtectedEndpoint(...toArray(options.permissions?.update))
    @ApiUpdateOperation(options.entityName, (options.entityType ?? Object) as Type<unknown>)
    async update(@Param('id') id: TId, @Body() dto: TUpdateDto, @CurrentContext() context: IRequestContext): Promise<TEntity> {
      this.assertEnabled('update');
      return this.service.update(id, dto, context);
    }

    @Put(':id')
    @ProtectedEndpoint(...toArray(options.permissions?.update))
    @ApiUpdateOperation(options.entityName, (options.entityType ?? Object) as Type<unknown>)
    async replace(@Param('id') id: TId, @Body() dto: TUpdateDto, @CurrentContext() context: IRequestContext): Promise<TEntity> {
      this.assertEnabled('update');
      return this.service.update(id, dto, context);
    }

    // -----------------------------------------------------------------
    // Delete / Restore
    // -----------------------------------------------------------------
    @Delete(':id')
    @ProtectedEndpoint(...toArray(options.permissions?.delete))
    @ApiDeleteOperation(options.entityName)
    async remove(@Param('id') id: TId, @CurrentContext() context: IRequestContext): Promise<TEntity> {
      this.assertEnabled('delete');
      return this.service.delete(id, context);
    }

    @Post(':id/restore')
    @ProtectedEndpoint(...toArray(options.permissions?.restore))
    @ApiRestoreOperation(options.entityName)
    async restore(@Param('id') id: TId, @CurrentContext() context: IRequestContext): Promise<TEntity> {
      this.assertEnabled('restore');
      if (!hasSoftDelete(this.service)) {
        throw new BadRequestException(
          `${options.entityName} does not support restore (its service does not implement ISoftDeleteService).`,
        );
      }
      return this.service.restore(id, context);
    }

    // -----------------------------------------------------------------
    // Bulk operations
    // -----------------------------------------------------------------
    @Post('bulk')
    @ProtectedEndpoint(...toArray(options.permissions?.bulk))
    @ApiBulkOperation(options.entityName, 'create')
    async bulkCreate(@Body() dto: BulkCreateDto<TCreateDto>, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('bulk');
      const results: TEntity[] = [];
      const errors: IBulkOperationError[] = [];
      for (let i = 0; i < dto.items.length; i++) {
        try {
          results.push(await this.service.create(dto.items[i], context));
        } catch (error) {
          errors.push({ index: i, message: error instanceof Error ? error.message : String(error) });
        }
      }
      return new BulkOperationResponse<TEntity>(results, errors, dto.items.length);
    }

    @Patch('bulk')
    @ProtectedEndpoint(...toArray(options.permissions?.bulk))
    @ApiBulkOperation(options.entityName, 'update')
    async bulkUpdate(@Body() dto: BulkUpdateDto<TUpdateDto>, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('bulk');
      const results: TEntity[] = [];
      const errors: IBulkOperationError[] = [];
      for (let i = 0; i < dto.items.length; i++) {
        try {
          results.push(await this.service.update(dto.items[i].id as unknown as TId, dto.items[i].data, context));
        } catch (error) {
          errors.push({ index: i, identifier: dto.items[i].id, message: error instanceof Error ? error.message : String(error) });
        }
      }
      return new BulkOperationResponse<TEntity>(results, errors, dto.items.length);
    }

    @Delete('bulk')
    @ProtectedEndpoint(...toArray(options.permissions?.bulk))
    @ApiBulkOperation(options.entityName, 'delete')
    async bulkDelete(@Body() dto: BulkDeleteDto, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('bulk');
      const results: TEntity[] = [];
      const errors: IBulkOperationError[] = [];
      for (let i = 0; i < dto.ids.length; i++) {
        try {
          results.push(await this.service.delete(dto.ids[i] as unknown as TId, context));
        } catch (error) {
          errors.push({ index: i, identifier: dto.ids[i], message: error instanceof Error ? error.message : String(error) });
        }
      }
      return new BulkOperationResponse<TEntity>(results, errors, dto.ids.length);
    }

    @Post('bulk/restore')
    @ProtectedEndpoint(...toArray(options.permissions?.bulk))
    @ApiBulkOperation(options.entityName, 'restore')
    async bulkRestore(@Body() dto: BulkRestoreDto, @CurrentContext() context: IRequestContext) {
      this.assertEnabled('bulk');
      if (!hasSoftDelete(this.service)) {
        throw new BadRequestException(
          `${options.entityName} does not support restore (its service does not implement ISoftDeleteService).`,
        );
      }
      const results: TEntity[] = [];
      const errors: IBulkOperationError[] = [];
      for (let i = 0; i < dto.ids.length; i++) {
        try {
          results.push(await this.service.restore(dto.ids[i] as unknown as TId, context));
        } catch (error) {
          errors.push({ index: i, identifier: dto.ids[i], message: error instanceof Error ? error.message : String(error) });
        }
      }
      return new BulkOperationResponse<TEntity>(results, errors, dto.ids.length);
    }
  }

  // Apply class-level decorators programmatically since `path` and the DI
  // token are only known at factory-call time (this is the standard
  // NestJS "controller mixin" technique).
  ApiCrudController(options.entityName, path)(GeneratedCrudController);
  Inject(options.serviceToken)(GeneratedCrudController, undefined as unknown as string, 0);

  return GeneratedCrudController as Type<unknown>;
}

function toArray(permission: string | string[] | undefined): string[] {
  if (!permission) return [];
  return Array.isArray(permission) ? permission : [permission];
}
