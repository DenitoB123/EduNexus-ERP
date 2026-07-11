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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('users')
@Version('1')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('admin', 'super-admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: RequestUser) {
    return this.userService.findById(user.id);
  }

  @Get()
  @Roles('admin', 'super-admin')
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userService.findAll(user.schoolId ?? undefined, page, limit);
  }

  @Get(':id')
  @Roles('admin', 'super-admin')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch('me')
  updateSelf(@CurrentUser() user: RequestUser, @Body() dto: UpdateUserDto) {
    const { roleIds: _r, status: _s, ...safeDto } = dto;
    return this.userService.update(user.id, safeDto);
  }

  @Patch(':id')
  @Roles('admin', 'super-admin')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
  }
}
