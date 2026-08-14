import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { ExperienceService } from './experience.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin/experience')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/experience')
export class AdminExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get()
  findAll() {
    return this.experienceService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an experience entry' })
  create(@Body() dto: CreateExperienceDto) {
    return this.experienceService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an experience entry' })
  update(@Param('id') id: string, @Body() dto: UpdateExperienceDto) {
    return this.experienceService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an experience entry' })
  async remove(@Param('id') id: string) {
    await this.experienceService.remove(id);
    return { deleted: true };
  }
}
