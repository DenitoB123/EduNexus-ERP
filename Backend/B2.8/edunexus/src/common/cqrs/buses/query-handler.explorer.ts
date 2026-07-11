import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { QueryHandlerRegistry } from './query-handler.registry';
import { QUERY_HANDLER_METADATA } from '../constants/cqrs.constants';
import { IQuery, IQueryHandler, QueryType } from '../interfaces/query.interface';
import { AppLoggerService } from '../../logger/app-logger.service';

@Injectable()
export class QueryHandlerExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly registry: QueryHandlerRegistry,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('QueryHandlerExplorer');
  }

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const queryType = this.reflector.get<QueryType<IQuery> | undefined>(
        QUERY_HANDLER_METADATA,
        metatype,
      );
      if (!queryType) continue;

      this.registry.register(queryType, instance as IQueryHandler<IQuery, unknown>);
      this.logger.log(`Registered "${metatype.name}" as handler for query "${queryType.name}"`);
    }
  }
}
