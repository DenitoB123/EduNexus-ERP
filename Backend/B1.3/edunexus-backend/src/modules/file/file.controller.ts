import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('files')
@Version('1')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.fileService.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      dto,
      { userId: user.id, schoolId: user.schoolId, roles: user.roles },
    );
  }

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.fileService.listForSchool(user.schoolId, page, limit);
  }

  @Get(':id')
  getMetadata(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.fileService.getMetadata(id, {
      userId: user.id,
      schoolId: user.schoolId,
      roles: user.roles,
    });
  }

  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.fileService.getDownloadUrl(id, {
      userId: user.id,
      schoolId: user.schoolId,
      roles: user.roles,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.fileService.remove(id, {
      userId: user.id,
      schoolId: user.schoolId,
      roles: user.roles,
    });
  }
}
