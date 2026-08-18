import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /** Consolidated snapshot for the admin panel home screen. */
  async getDashboard() {
    const [projectCount, experienceCount, skillCount, mediaCount, overview] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.experience.count(),
      this.prisma.skill.count(),
      this.prisma.media.count(),
      this.analyticsService.getOverview(),
    ]);

    return {
      content: {
        projects: projectCount,
        experience: experienceCount,
        skills: skillCount,
        media: mediaCount,
      },
      analytics: overview,
    };
  }
}
