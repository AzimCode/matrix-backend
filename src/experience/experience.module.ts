import { Module } from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { ExperienceController } from './experience.controller';
import { AdminExperienceController } from './admin-experience.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';

@Module({
  imports: [AppCacheModule],
  controllers: [ExperienceController, AdminExperienceController],
  providers: [ExperienceService],
  exports: [ExperienceService],
})
export class ExperienceModule {}
