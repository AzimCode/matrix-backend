import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteService } from './site.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('site')
@Controller()
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

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
