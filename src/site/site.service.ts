import { Injectable } from '@nestjs/common';
import { ProfileService } from '../profile/profile.service';
import { ExperienceService } from '../experience/experience.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
import { EducationService } from '../education/education.service';
import { CertificatesService } from '../certificates/certificates.service';
import { ResumeService } from '../resume/resume.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys } from '../common/cache/cache-keys';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SiteService {
  constructor(
    private readonly profileService: ProfileService,
    private readonly experienceService: ExperienceService,
    private readonly projectsService: ProjectsService,
    private readonly skillsService: SkillsService,
    private readonly educationService: EducationService,
    private readonly certificatesService: CertificatesService,
    private readonly resumeService: ResumeService,
    private readonly cache: AppCacheService,
  ) {}

  async getSite() {
    const cached = await this.cache.get(CacheKeys.site);
    if (cached) {
      return cached;
    }

    const [profile, experience, projects, skills, education, certificates, resume] = await Promise.all([
      this.profileService.getPublicProfile(),
      this.experienceService.findAll(),
      this.projectsService.findAllForSite(),
      this.skillsService.findAll(),
      this.educationService.findAll(),
      this.certificatesService.findAll(),
      this.resumeService.getActive().catch(() => null),
    ]);

    const result = {
      profile,
      experience,
      projects,
      skills,
      education,
      certificates,
      resume: resume ? { version: resume.version, uploadedAt: resume.uploadedAt, downloadUrl: '/api/resume/download' } : null,
    };

    await this.cache.set(CacheKeys.site, result, CACHE_TTL_MS);
    return result;
  }

  async getSystemStatus() {
    const cached = await this.cache.get(CacheKeys.systemStatus);
    if (cached) {
      return cached;
    }
    const profile = await this.profileService.getPublicProfile();
    const result = {
      systemStatus: profile.systemStatus,
      availability: profile.availability,
      accentColor: profile.accentColor,
      profileVersion: profile.profileVersion,
      terminalMessages: profile.terminalMessages,
    };
    await this.cache.set(CacheKeys.systemStatus, result, CACHE_TTL_MS);
    return result;
  }
}
