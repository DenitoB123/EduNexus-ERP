import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { DocumentType, DocumentTemplateFormat } from '../constants/document-type.enum';
import { BrandingConfig } from '../../reporting/interfaces/branding.interface';

export class CreateDocumentTemplateDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsOptional()
  @IsEnum(DocumentTemplateFormat)
  format?: DocumentTemplateFormat;

  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @IsString()
  @IsNotEmpty()
  bodyTemplate!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFields?: string[];

  @IsOptional()
  @IsObject()
  branding?: BrandingConfig;
}

export class UpdateDocumentTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFields?: string[];

  @IsOptional()
  @IsObject()
  branding?: BrandingConfig;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
