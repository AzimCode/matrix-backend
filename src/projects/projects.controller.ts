import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsEventType } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { ProjectQueryDto } from './dto/project-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { AnalyticsService } from '../analytics/analytics.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published projects with optional filtering + pagination' })
  findAll(@Query() query: ProjectQueryDto) {
    return this.projectsService.findAllPublic(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'List featured published projects' })
  findFeatured() {
    return this.projectsService.findFeatured();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a published project by slug' })
  async findBySlug(@Param('slug') slug: string, @Req() req: Request) {
    const project = await this.projectsService.findBySlugPublic(slug);
    await this.analyticsService.track(AnalyticsEventType.PROJECT_VIEW, req, project.id);
    return project;
  }
}
