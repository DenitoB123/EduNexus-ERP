import { randomUUID } from 'crypto';
import { IQuery } from '../interfaces/query.interface';

export abstract class BaseQuery implements IQuery {
  readonly queryId: string;
  readonly queryName: string;
  readonly issuedAt: Date;

  protected constructor() {
    this.queryId = randomUUID();
    this.queryName = new.target.name;
    this.issuedAt = new Date();
  }
}
