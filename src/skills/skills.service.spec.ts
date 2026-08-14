import { Test } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { NotFoundAppException } from '../common/exceptions/app.exception';

describe('SkillsService', () => {
  let service: SkillsService;
  let prisma: any;
  let cache: jest.Mocked<AppCacheService>;

  const skillA = { id: 'skill-a', name: 'REACT' };
  const skillB = { id: 'skill-b', name: 'CODE' };

  beforeEach(async () => {
    prisma = {
      skill: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      skillRelation: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
      delByPrefix: jest.fn(),
    } as unknown as jest.Mocked<AppCacheService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppCacheService, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(SkillsService);
  });

  describe('getMatrix', () => {
    it('returns skills + relations together and caches the result', async () => {
      prisma.skill.findMany.mockResolvedValue([skillA, skillB]);
      prisma.skillRelation.findMany.mockResolvedValue([{ skillId: 'skill-a', relatedSkillId: 'skill-b', strength: 4 }]);

      const matrix = await service.getMatrix();

      expect(matrix.skills).toHaveLength(2);
      expect(matrix.relations).toHaveLength(1);
      expect(cache.set).toHaveBeenCalled();
    });

    it('returns the cached matrix without hitting the database on a hit', async () => {
      cache.get.mockResolvedValueOnce({ skills: [skillA], relations: [] });

      const matrix = await service.getMatrix();

      expect(matrix.skills).toEqual([skillA]);
      expect(prisma.skill.findMany).not.toHaveBeenCalled();
    });
  });

  describe('addRelation', () => {
    it('rejects a skill relating to itself', async () => {
      prisma.skill.findUnique.mockResolvedValue(skillA);

      await expect(service.addRelation('skill-a', { relatedSkillId: 'skill-a' })).rejects.toThrow();
    });

    it('throws NotFoundAppException when the related skill does not exist', async () => {
      prisma.skill.findUnique.mockResolvedValueOnce(skillA).mockResolvedValueOnce(null);

      await expect(service.addRelation('skill-a', { relatedSkillId: 'nope' })).rejects.toThrow(NotFoundAppException);
    });
  });
});
