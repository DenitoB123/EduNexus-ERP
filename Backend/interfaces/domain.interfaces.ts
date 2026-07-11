export interface IBaseEntity {
  id: string;
}

export interface IAuditable {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface ISoftDelete {
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted(): boolean;
}

export interface ITenantEntity {
  tenantId: string;
  schoolGroupId?: string | null;
  schoolId?: string | null;
  campusId?: string | null;
}

export interface IDomainEvent {
  eventId: string;
  eventName: string;
  occurredAt: Date;
  tenantId?: string;
  correlationId?: string;
}

export interface IAggregateRoot<TId = string> {
  readonly id: TId;
  getUncommittedEvents(): IDomainEvent[];
  clearUncommittedEvents(): void;
}

export interface IEntityFactory<TEntity, TCreateProps> {
  create(props: TCreateProps): TEntity;
}

export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
