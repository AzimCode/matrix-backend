import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all skills' })
  findAll() {
    return this.skillsService.findAll();
  }

  @Public()
  @Get('matrix')
  @ApiOperation({ summary: 'Get the full skill matrix (skills + relations) in one request' })
  getMatrix() {
    return this.skillsService.getMatrix();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single skill' })
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @Public()
  @Get(':id/relations')
  @ApiOperation({ summary: 'Get relations for a skill' })
  findRelations(@Param('id') id: string) {
    return this.skillsService.findRelations(id);
  }
}
