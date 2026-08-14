import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { EducationService } from './education.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin/education')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/education')
export class AdminEducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get()
  findAll() {
    return this.educationService.findAll();
  }

  @Post()
  create(@Body() dto: CreateEducationDto) {
    return this.educationService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEducationDto) {
    return this.educationService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.educationService.remove(id);
    return { deleted: true };
  }
}
