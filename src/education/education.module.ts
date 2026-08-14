import { Module } from '@nestjs/common';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { AdminEducationController } from './admin-education.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';

@Module({
  imports: [AppCacheModule],
  controllers: [EducationController, AdminEducationController],
  providers: [EducationService],
  exports: [EducationService],
})
export class EducationModule {}
