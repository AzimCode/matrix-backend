import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateSkillRelationDto } from './dto/create-skill-relation.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin/skills')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/skills')
export class AdminSkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  findAll() {
    return this.skillsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a skill' })
  create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a skill' })
  update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a skill' })
  async remove(@Param('id') id: string) {
    await this.skillsService.remove(id);
    return { deleted: true };
  }

  @Post(':id/relations')
  @ApiOperation({ summary: 'Create or update a relation from this skill to another' })
  addRelation(@Param('id') id: string, @Body() dto: CreateSkillRelationDto) {
    return this.skillsService.addRelation(id, dto);
  }

  @Delete(':id/relations/:relatedSkillId')
  @ApiOperation({ summary: 'Remove a relation between two skills' })
  async removeRelation(@Param('id') id: string, @Param('relatedSkillId') relatedSkillId: string) {
    await this.skillsService.removeRelation(id, relatedSkillId);
    return { deleted: true };
  }
}
