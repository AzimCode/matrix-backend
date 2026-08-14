import { Test } from '@nestjs/testing';
import { ProjectStatus } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { NotFoundAppException } from '../common/exceptions/app.exception';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;
  let cache: jest.Mocked<AppCacheService>;

  beforeEach(async () => {
    prisma = {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      projectTechnology: { deleteMany: jest.fn() },
      projectMedia: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };

    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
      delByPrefix: jest.fn(),
    } as unknown as jest.Mocked<AppCacheService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppCacheService, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  describe('create', () => {
    it('appends a numeric suffix when the derived slug already exists', async () => {
      prisma.project.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // "my-project" taken
        .mockResolvedValueOnce(null); // "my-project-2" free
      prisma.project.create.mockResolvedValue({
        id: 'new-id',
        slug: 'my-project-2',
        technologies: [],
        gallery: [],
      });

      await service.create({ title: 'My Project', description: 'desc', year: 2026 } as any);

      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'my-project-2' }) }),
      );
    });

    it('uses the title-derived slug directly when it is not taken', async () => {
      prisma.project.findUnique.mockResolvedValueOnce(null);
      prisma.project.create.mockResolvedValue({ id: 'id', slug: 'fresh-title', technologies: [], gallery: [] });

      await service.create({ title: 'Fresh Title', description: 'd', year: 2026 } as any);

      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'fresh-title' }) }),
      );
    });
  });

  describe('findBySlugPublic', () => {
    it('throws NotFoundAppException for a draft/archived project (public visibility)', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findBySlugPublic('draft-project')).rejects.toThrow(NotFoundAppException);
      expect(prisma.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: ProjectStatus.PUBLISHED }) }),
      );
    });
  });

  describe('remove', () => {
    it('throws when the project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundAppException);
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });
  });
});
