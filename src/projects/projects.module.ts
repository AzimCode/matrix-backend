import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { AdminProjectsController } from './admin-projects.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AppCacheModule, AnalyticsModule],
  controllers: [ProjectsController, AdminProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
