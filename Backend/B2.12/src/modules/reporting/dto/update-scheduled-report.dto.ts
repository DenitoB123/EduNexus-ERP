import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ExportFormat } from '../constants/export-format.enum';
import { ScheduleFrequency } from '../constants/schedule-frequency.enum';
import { ReportDeliveryChannel } from '../constants/report-status.enum';

export class UpdateScheduledReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @IsOptional()
  @IsEnum(ScheduleFrequency)
  frequency?: ScheduleFrequency;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ReportDeliveryChannel, { each: true })
  deliveryChannels?: ReportDeliveryChannel[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipientEmails?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
