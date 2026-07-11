import { BaseModel } from '../../database/interfaces/base-model.interface';

export abstract class BaseEntity implements BaseModel {
  id!: string;
  tenantId!: string;
  schoolGroupId?: string | null;
  schoolId?: string | null;
  campusId?: string | null;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedBy?: string | null;
}
