import { Test } from '@nestjs/testing';
import { AnalyticsEventType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  const req = {
    headers: { 'user-agent': 'Mozilla/5.0 (test)', 'x-forwarded-for': '198.51.100.7' },
    ip: '198.51.100.7',
    socket: {},
  } as any;

  beforeEach(async () => {
    prisma = {
      analyticsEvent: { create: jest.fn(), count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
      contactMessage: { count: jest.fn() },
      project: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppConfigService, useValue: { security: { ipHashPepper: 'pepper' } } },
      ],
    }).compile();

    service = moduleRef.get(AnalyticsService);
  });

  it('never stores the raw IP, only a session hash', async () => {
    prisma.analyticsEvent.create.mockResolvedValue({});

    await service.track(AnalyticsEventType.PAGE_VIEW, req);

    const data = prisma.analyticsEvent.create.mock.calls[0][0].data;
    expect(data.sessionHash).not.toContain('198.51.100.7');
    expect(data).not.toHaveProperty('ip');
  });

  it('swallows database errors instead of throwing, so tracking never breaks the request', async () => {
    prisma.analyticsEvent.create.mockRejectedValue(new Error('db unavailable'));

    await expect(service.track(AnalyticsEventType.CV_DOWNLOAD, req)).resolves.toBeUndefined();
  });

  it('builds an overview combining views, sessions, downloads, and contact requests', async () => {
    prisma.analyticsEvent.count
      .mockResolvedValueOnce(120) // totalViews
      .mockResolvedValueOnce(40) // projectViews
      .mockResolvedValueOnce(15); // cvDownloads
    prisma.analyticsEvent.findMany
      .mockResolvedValueOnce([{ sessionHash: 'a' }, { sessionHash: 'b' }]) // unique sessions
      .mockResolvedValueOnce([{ referrer: 'https://google.com/search' }]);
    prisma.analyticsEvent.groupBy.mockResolvedValue([]);
    prisma.contactMessage.count.mockResolvedValue(8);
    prisma.project.findMany.mockResolvedValue([]);

    const overview = await service.getOverview();

    expect(overview.totalViews).toBe(120);
    expect(overview.uniqueSessions).toBe(2);
    expect(overview.contactRequests).toBe(8);
    expect(overview.trafficSources[0]).toEqual({ source: 'google.com', count: 1 });
  });
});
