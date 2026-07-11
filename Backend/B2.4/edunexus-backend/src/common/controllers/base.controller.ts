/**
 * base.controller.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Foundational abstract class every generated controller extends. Holds
 * the injected generic service (from B2.3) plus small shared helpers.
 * Deliberately undecorated (no @Controller/@Get/etc.) — CrudControllerMixin
 * (./crud.controller.ts) is what turns this into a real, routed NestJS
 * controller with entity-specific paths. Business modules that need fully
 * custom (non-generated) controllers can still extend this directly to
 * reuse the context-building/id-parsing helpers.
 */

import { NotFoundException } from '@nestjs/common';
import { ICrudService } from '../interfaces/service.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import { IControllerOptions } from '../interfaces/controller.interfaces';

export abstract class BaseController<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string> {
  protected constructor(
    protected readonly options: IControllerOptions<TEntity>,
    protected readonly service: ICrudService<TEntity, TCreateDto, TUpdateDto, TId>,
  ) {}

  /** Guards against calling a route that was explicitly disabled for this entity via IControllerOptions.disable. */
  protected assertEnabled(operation: keyof NonNullable<IControllerOptions<TEntity>['disable']>): void {
    if (this.options.disable?.[operation]) {
      throw new NotFoundException(`Operation "${operation}" is not available for ${this.options.entityName}.`);
    }
  }

  /** Fetches an entity by id or throws a standardized 404, delegating to the service's own findByIdOrThrow-equivalent when available. */
  protected async requireEntity(id: TId, context: IRequestContext): Promise<TEntity> {
    const entity = await this.service.findById(id, context);
    if (!entity) {
      throw new NotFoundException(`${this.options.entityName} with id "${String(id)}" was not found.`);
    }
    return entity;
  }
}
