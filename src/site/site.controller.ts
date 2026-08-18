import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SiteService } from './site.service';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
import { AppConfigService } from '../config/app-config.service';

@ApiTags('site')
@Controller()
export class SiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * The API and the public site live on near-identical hostnames, so trimming
   * "/admin/" off the address to reach the site lands here instead — which was
   * a bare NOT_FOUND that reads as an outage.
   *
   * Excluded from the global "api" prefix in configureApp, the same way the
   * health probe is, so it stays a normal controller route rather than a raw
   * Express handler bolted on beside the pipeline.
   */
  @Public()
  @RawResponse()
  @Get()
  @ApiExcludeEndpoint()
  redirectToPanel(@Res() res: Response) {
    res.redirect(HttpStatus.FOUND, '/admin/');
  }

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Public URLs the admin panel links to' })
  getConfig() {
    // CORS_ORIGIN is the site's own address; the first entry is the canonical one.
    return { siteUrl: this.config.publicAppUrl ?? this.config.cors.origin[0] ?? null };
  }

  @Public()
  @Get('site')
  @ApiOperation({ summary: 'Single aggregate request for the whole frontend: profile, experience, projects, skills, education, certificates, resume' })
  getSite() {
    return this.siteService.getSite();
  }

  @Public()
  @Get('system/status')
  @ApiOperation({ summary: 'Matrix-specific presentation data the frontend drives its animation state from' })
  getSystemStatus() {
    return this.siteService.getSystemStatus();
  }
}
