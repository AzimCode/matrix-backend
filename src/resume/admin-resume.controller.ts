import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { ResumeService } from './resume.service';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppException } from '../common/exceptions/app.exception';

const MAX_RESUME_BYTES = 10 * 1024 * 1024;

@ApiTags('admin/resume')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/resume')
export class AdminResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  @ApiOperation({ summary: 'List all resume versions' })
  listAll() {
    return this.resumeService.listAll();
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, version: { type: 'string' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RESUME_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload a new CV/resume PDF and set it active' })
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadResumeDto) {
    if (!file) {
      throw new AppException('FILE_REQUIRED', 'A PDF file is required', HttpStatus.BAD_REQUEST);
    }
    const version = dto.version ?? new Date().toISOString();
    return this.resumeService.uploadNewVersion(file, version);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Mark a resume version as the active one' })
  activate(@Param('id') id: string) {
    return this.resumeService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inactive resume version' })
  async remove(@Param('id') id: string) {
    await this.resumeService.remove(id);
    return { deleted: true };
  }
}
