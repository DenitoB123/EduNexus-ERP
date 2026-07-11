import { SetMetadata } from '@nestjs/common';
import { IQuery, QueryType } from '../interfaces/query.interface';
import { QUERY_HANDLER_METADATA } from '../constants/cqrs.constants';

export const QueryHandler = (query: QueryType<IQuery>): ClassDecorator =>
  SetMetadata(QUERY_HANDLER_METADATA, query);
