import {
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BaseService } from './base.service';
import { PaginationDto } from '../dto/pagination.dto';
import { PaginatedResponseDto, ResponseDto } from '../dto/response.dto';

export abstract class BaseController<
  TEntity,
  TCreateDto = Partial<TEntity>,
  TUpdateDto = Partial<TEntity>,
> {
  constructor(
    protected readonly service: BaseService<TEntity, TCreateDto, TUpdateDto>,
  ) {}

  @Get()
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<TEntity>> {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseDto<TEntity>> {
    const entity = await this.service.findById(id);
    return ResponseDto.ok(entity);
  }

  @Post()
  async create(@Body() dto: TCreateDto): Promise<ResponseDto<TEntity>> {
    const entity = await this.service.create(dto);
    return ResponseDto.ok(entity, 'Created successfully');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: TUpdateDto,
  ): Promise<ResponseDto<TEntity>> {
    const entity = await this.service.update(id, dto);
    return ResponseDto.ok(entity, 'Updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
