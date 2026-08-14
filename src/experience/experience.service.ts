import { Injectable } from '@nestjs/common';
import { Experience } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys } from '../common/cache/cache-keys';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { NotFoundAppException } from '../common/exceptions/app.exception';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ExperienceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async findAll(): Promise<Experience[]> {
    const cached = await this.cache.get<Experience[]>(CacheKeys.experience);
    if (cached) {
      return cached;
    }
    const items = await this.prisma.experience.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
    });
    await this.cache.set(CacheKeys.experience, items, CACHE_TTL_MS);
    return items;
  }

  async findOne(id: string): Promise<Experience> {
    const item = await this.prisma.experience.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundAppException('Experience');
    }
    return item;
  }

  async create(dto: CreateExperienceDto): Promise<Experience> {
    const created = await this.prisma.experience.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.invalidateCache();
    return created;
  }

  async update(id: string, dto: UpdateExperienceDto): Promise<Experience> {
    await this.findOne(id);
    const updated = await this.prisma.experience.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.experience.delete({ where: { id } });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([this.cache.del(CacheKeys.experience), this.cache.del(CacheKeys.site)]);
  }
}
