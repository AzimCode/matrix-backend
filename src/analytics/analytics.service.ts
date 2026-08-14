import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventType } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { hashWithPepper } from '../common/utils/hash.util';
import { extractClientIp } from '../common/utils/request-ip.util';
import { detectDevice, extractReferrerHost } from '../common/utils/device.util';

export interface AnalyticsOverview {
  totalViews: number;
  uniqueSessions: number;
  projectViews: number;
  cvDownloads: number;
  contactRequests: number;
  topProjects: { projectId: string; title: string; views: number }[];
  trafficSources: { source: string; count: number }[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Records an analytics event. Never throws — a tracking failure must not
   * break the request it's attached to (resume download, project view, etc.).
   */
  async track(event: AnalyticsEventType, req: Request, projectId?: string): Promise<void> {
    try {
      const ip = extractClientIp(req);
      const userAgent = req.headers['user-agent'];
      const sessionHash = hashWithPepper(`${ip}:${userAgent ?? ''}`, this.config.security.ipHashPepper);
      const referrer = (req.headers.referer as string) ?? (req.headers.referrer as string) ?? undefined;

      await this.prisma.analyticsEvent.create({
        data: {
          event,
          projectId,
          sessionHash,
          device: detectDevice(userAgent),
          referrer: referrer?.slice(0, 500),
          country: (req.headers['cf-ipcountry'] as string) ?? (req.headers['x-vercel-ip-country'] as string) ?? undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to record analytics event ${event}: ${(err as Error).message}`);
    }
  }

  async getOverview(): Promise<AnalyticsOverview> {
    const [totalViews, uniqueSessionRows, projectViews, cvDownloads, contactRequests, topProjectRows, referrerRows] =
      await Promise.all([
        this.prisma.analyticsEvent.count({
          where: { event: { in: [AnalyticsEventType.PAGE_VIEW, AnalyticsEventType.PROJECT_VIEW] } },
        }),
        this.prisma.analyticsEvent.findMany({ distinct: ['sessionHash'], select: { sessionHash: true } }),
        this.prisma.analyticsEvent.count({ where: { event: AnalyticsEventType.PROJECT_VIEW } }),
        this.prisma.analyticsEvent.count({ where: { event: AnalyticsEventType.CV_DOWNLOAD } }),
        this.prisma.contactMessage.count(),
        this.prisma.analyticsEvent.groupBy({
          by: ['projectId'],
          where: { event: AnalyticsEventType.PROJECT_VIEW, projectId: { not: null } },
          _count: { projectId: true },
          orderBy: { _count: { projectId: 'desc' } },
          take: 5,
        }),
        this.prisma.analyticsEvent.findMany({
          where: { referrer: { not: null } },
          select: { referrer: true },
          take: 1000,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const projectIds = topProjectRows.map((r) => r.projectId).filter((id): id is string => Boolean(id));
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, title: true },
    });
    const titleById = new Map(projects.map((p) => [p.id, p.title]));

    const sourceCounts = new Map<string, number>();
    for (const row of referrerRows) {
      const host = extractReferrerHost(row.referrer ?? undefined) ?? 'direct';
      sourceCounts.set(host, (sourceCounts.get(host) ?? 0) + 1);
    }

    return {
      totalViews,
      uniqueSessions: uniqueSessionRows.length,
      projectViews,
      cvDownloads,
      contactRequests,
      topProjects: topProjectRows
        .filter((r) => r.projectId)
        .map((r) => ({
          projectId: r.projectId as string,
          title: titleById.get(r.projectId as string) ?? 'Unknown',
          views: r._count.projectId,
        })),
      trafficSources: [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([source, count]) => ({ source, count })),
    };
  }

  async getProjectStats(): Promise<{ projectId: string; title: string; views: number }[]> {
    const rows = await this.prisma.analyticsEvent.groupBy({
      by: ['projectId'],
      where: { event: AnalyticsEventType.PROJECT_VIEW, projectId: { not: null } },
      _count: { projectId: true },
      orderBy: { _count: { projectId: 'desc' } },
    });
    const projectIds = rows.map((r) => r.projectId).filter((id): id is string => Boolean(id));
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, title: true },
    });
    const titleById = new Map(projects.map((p) => [p.id, p.title]));
    return rows
      .filter((r) => r.projectId)
      .map((r) => ({
        projectId: r.projectId as string,
        title: titleById.get(r.projectId as string) ?? 'Unknown',
        views: r._count.projectId,
      }));
  }
}
