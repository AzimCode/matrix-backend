import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Consolidated content, message, and analytics snapshot for the admin home screen' })
  getDashboard() {
    return this.adminService.getDashboard();
  }
}
