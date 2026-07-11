import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import { SettingScope } from '@prisma/client';
import { SystemSettingsService } from './system-settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Roles } from '../rbac/decorators/roles.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('system-settings')
@Version('1')
@Roles('admin', 'super-admin')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  list(@Query('scope') scope?: SettingScope, @Query('schoolId') schoolId?: string) {
    return this.settingsService.list(scope, schoolId);
  }

  @Get(':key')
  get(@Param('key') key: string, @Query('schoolId') schoolId?: string) {
    return this.settingsService.get(key, schoolId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSettingDto, @CurrentUser() user: RequestUser) {
    return this.settingsService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.settingsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.settingsService.remove(id, user.id);
  }
}
