import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AnalyticsEventType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a client-side page view event' })
  async track(@Body() dto: TrackEventDto, @Req() req: Request) {
    await this.analyticsService.track(AnalyticsEventType[dto.event], req);
    return { tracked: true };
  }
}
