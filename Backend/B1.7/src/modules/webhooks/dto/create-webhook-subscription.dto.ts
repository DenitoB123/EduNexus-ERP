import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ example: 'https://partner.example.com/hooks/edunexus' })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiProperty({ example: ['student.registered', 'payment.completed'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateWebhookSubscriptionDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
