import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EducationService } from './education.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('education')
@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List education entries' })
  findAll() {
    return this.educationService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.educationService.findOne(id);
  }
}
