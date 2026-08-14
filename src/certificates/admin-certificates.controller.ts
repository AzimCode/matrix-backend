import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin/certificates')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/certificates')
export class AdminCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  findAll() {
    return this.certificatesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCertificateDto) {
    return this.certificatesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCertificateDto) {
    return this.certificatesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.certificatesService.remove(id);
    return { deleted: true };
  }
}
