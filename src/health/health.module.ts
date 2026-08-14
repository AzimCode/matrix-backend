import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';

@Module({
  imports: [AppCacheModule],
  controllers: [HealthController],
})
export class HealthModule {}
