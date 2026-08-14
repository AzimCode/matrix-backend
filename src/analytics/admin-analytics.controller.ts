import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin/analytics')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Aggregate analytics overview: views, sessions, downloads, top projects, sources' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('projects')
  @ApiOperation({ summary: 'Per-project view counts' })
  getProjectStats() {
    return this.analyticsService.getProjectStats();
  }
}
