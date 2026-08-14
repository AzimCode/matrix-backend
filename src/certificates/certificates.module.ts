import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { AdminCertificatesController } from './admin-certificates.controller';
import { AppCacheModule } from '../common/cache/app-cache.module';

@Module({
  imports: [AppCacheModule],
  controllers: [CertificatesController, AdminCertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
