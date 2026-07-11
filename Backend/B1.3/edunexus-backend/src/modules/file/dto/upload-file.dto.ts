import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileVisibility } from '@prisma/client';

export class UploadFileDto {
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  /** Logical folder/category, e.g. 'avatars', 'report-cards', 'assignments'. */
  @IsOptional()
  @IsString()
  category?: string;
}
