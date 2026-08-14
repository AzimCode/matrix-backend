import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { AdminProfileController } from './admin-profile.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';

@Module({
  imports: [AppCacheModule],
  controllers: [ProfileController, AdminProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
