import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List certificates' })
  findAll() {
    return this.certificatesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certificatesService.findOne(id);
  }
}
