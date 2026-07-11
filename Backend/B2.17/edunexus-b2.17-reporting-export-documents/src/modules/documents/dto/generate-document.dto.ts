import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '../constants/document-type.enum';

export class GenerateDocumentDto {
  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsString()
  @IsNotEmpty()
  templateCode!: string;

  @IsObject()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsIn(['portrait', 'landscape'])
  orientation?: 'portrait' | 'landscape';

  @IsOptional()
  @IsString()
  watermarkText?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;
}
