import { Type } from 'class-transformer';
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
  ValidateIf,
} from 'class-validator';
import { ExportFormat } from '../constants/export-format.enum';
import { ScheduleFrequency } from '../constants/schedule-frequency.enum';
import { ReportDeliveryChannel } from '../constants/report-status.enum';

export class CreateScheduledReportDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  reportKey!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsEnum(ScheduleFrequency)
  frequency!: ScheduleFrequency;

  /** Required and validated as a cron expression when frequency === CUSTOM. */
  @ValidateIf((dto: CreateScheduledReportDto) => dto.frequency === ScheduleFrequency.CUSTOM)
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ReportDeliveryChannel, { each: true })
  deliveryChannels!: ReportDeliveryChannel[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @Type(() => String)
  recipientEmails?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
