import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteService } from './site.service';
import { Public } from '../common/decorators/public.decorator';
import { AppConfigService } from '../config/app-config.service';

@ApiTags('site')
@Controller()
export class SiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly config: AppConfigService,
  ) {}

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
