import { Module } from '@nestjs/common';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { ProfileModule } from '../profile/profile.module';
import { ExperienceModule } from '../experience/experience.module';
import { ProjectsModule } from '../projects/projects.module';
import { SkillsModule } from '../skills/skills.module';
import { EducationModule } from '../education/education.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { ResumeModule } from '../resume/resume.module';
import { AppCacheModule } from '../common/cache/app-cache.module';

@Module({
  imports: [
    ProfileModule,
    ExperienceModule,
    ProjectsModule,
    SkillsModule,
    EducationModule,
    CertificatesModule,
    ResumeModule,
    AppCacheModule,
  ],
  controllers: [SiteController],
  providers: [SiteService],
})
export class SiteModule {}
