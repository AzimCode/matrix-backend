import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ResumeService } from './resume.service';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsEventType } from '@prisma/client';

@ApiTags('resume')
@Controller('resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get metadata for the currently active CV/resume' })
  async getActive() {
    const resume = await this.resumeService.getActive();
    return { version: resume.version, uploadedAt: resume.uploadedAt, downloadUrl: '/api/resume/download' };
  }

  @Public()
  @Get('download')
  @RawResponse()
  @ApiOperation({ summary: 'Redirect to a short-lived signed URL for the active CV PDF' })
  async download(@Req() req: Request, @Res() res: Response) {
    const { url } = await this.resumeService.getActiveDownloadUrl();
    await this.analyticsService.track(AnalyticsEventType.CV_DOWNLOAD, req);
    res.redirect(302, url);
  }
}
