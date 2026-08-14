import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExperienceService } from './experience.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('experience')
@Controller('experience')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List work experience, sorted by sortOrder' })
  findAll() {
    return this.experienceService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single experience entry' })
  findOne(@Param('id') id: string) {
    return this.experienceService.findOne(id);
  }
}
