import { Injectable } from '@nestjs/common';
import { ContactMessageStatus } from '@prisma/client';
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
    const [projectCount, experienceCount, skillCount, newMessages, totalMessages, mediaCount, overview] =
      await Promise.all([
        this.prisma.project.count(),
        this.prisma.experience.count(),
        this.prisma.skill.count(),
        this.prisma.contactMessage.count({ where: { status: ContactMessageStatus.NEW } }),
        this.prisma.contactMessage.count(),
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
      messages: {
        new: newMessages,
        total: totalMessages,
      },
      analytics: overview,
    };
  }
}
