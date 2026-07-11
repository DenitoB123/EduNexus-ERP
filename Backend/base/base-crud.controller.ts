import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BaseModel, QueryOptions } from '../../database/interfaces/base-model.interface';
import { BaseCrudService } from './base-crud.service';

export abstract class BaseCrudController<T extends BaseModel> {
  protected abstract readonly service: BaseCrudService<T>;

  @Get()
  findMany(@Query() query: QueryOptions) {
    return this.service.findMany(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() body: Partial<T>) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<T>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
