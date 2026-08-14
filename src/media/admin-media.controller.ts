import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AppException } from '../common/exceptions/app.exception';

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

@ApiTags('admin/media')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'List uploaded media' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.mediaService.findAll(query);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_MEDIA_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload a media asset (JPEG/PNG/WEBP/SVG/PDF)' })
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new AppException('FILE_REQUIRED', 'A file is required', HttpStatus.BAD_REQUEST);
    }
    return this.mediaService.upload(file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media asset' })
  async remove(@Param('id') id: string) {
    await this.mediaService.remove(id);
    return { deleted: true };
  }
}
