import { Expose } from 'class-transformer';

export abstract class BaseResponse {
  @Expose()
  id!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
