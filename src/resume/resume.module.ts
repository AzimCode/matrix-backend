import { Module } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { AdminResumeController } from './admin-resume.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AppCacheModule, AnalyticsModule],
  controllers: [ResumeController, AdminResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
