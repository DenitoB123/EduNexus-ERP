/**
 * service-hooks.interface.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Lifecycle hooks that BaseService invokes around every mutating operation.
 * Business modules override whichever hooks they need on their concrete
 * service subclass; unimplemented hooks are no-ops by default (see
 * BaseService's default implementations in ../services/base.service.ts).
 */

import { IRequestContext } from '../interfaces/context.interfaces';

export interface IServiceHooks<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string> {
  beforeCreate?(data: TCreateDto, context: IRequestContext): Promise<TCreateDto> | TCreateDto;
  afterCreate?(entity: TEntity, context: IRequestContext): Promise<void> | void;

  beforeUpdate?(id: TId, data: TUpdateDto, existing: TEntity, context: IRequestContext): Promise<TUpdateDto> | TUpdateDto;
  afterUpdate?(entity: TEntity, previous: TEntity, context: IRequestContext): Promise<void> | void;

  beforeDelete?(id: TId, existing: TEntity, context: IRequestContext): Promise<void> | void;
  afterDelete?(entity: TEntity, context: IRequestContext): Promise<void> | void;

  beforeRestore?(id: TId, existing: TEntity, context: IRequestContext): Promise<void> | void;
  afterRestore?(entity: TEntity, context: IRequestContext): Promise<void> | void;
}

/** Ordered hook name list, used by HookExecutor for logging/introspection. */
export const SERVICE_HOOK_NAMES = [
  'beforeCreate',
  'afterCreate',
  'beforeUpdate',
  'afterUpdate',
  'beforeDelete',
  'afterDelete',
  'beforeRestore',
  'afterRestore',
] as const;

export type ServiceHookName = (typeof SERVICE_HOOK_NAMES)[number];
