import { IsOptional, IsString } from 'class-validator';

export class MetadataDTO {
  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  actorId?: string;
}
