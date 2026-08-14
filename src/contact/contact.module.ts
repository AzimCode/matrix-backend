import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { AdminMessagesController } from './admin-messages.controller';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [ContactController, AdminMessagesController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
