import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AnalyticsEventType } from '@prisma/client';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { Public } from '../common/decorators/public.decorator';
import { AnalyticsService } from '../analytics/analytics.service';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit the contact form' })
  async submit(@Body() dto: CreateContactMessageDto, @Req() req: Request) {
    const { isSpam } = await this.contactService.submit(dto, req);
    if (!isSpam) {
      await this.analyticsService.track(AnalyticsEventType.CONTACT_SUBMIT, req);
    }
    // Response is intentionally identical whether or not spam heuristics fired,
    // so automated senders get no signal their message was filtered.
    return { received: true };
  }
}
