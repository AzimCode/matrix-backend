import { Injectable } from '@nestjs/common';
import { Education } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys } from '../common/cache/cache-keys';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { NotFoundAppException } from '../common/exceptions/app.exception';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class EducationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async findAll(): Promise<Education[]> {
    const cached = await this.cache.get<Education[]>(CacheKeys.education);
    if (cached) {
      return cached;
    }
    const items = await this.prisma.education.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
    });
    await this.cache.set(CacheKeys.education, items, CACHE_TTL_MS);
    return items;
  }

  async findOne(id: string): Promise<Education> {
    const item = await this.prisma.education.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundAppException('Education');
    }
    return item;
  }

  async create(dto: CreateEducationDto): Promise<Education> {
    const created = await this.prisma.education.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : undefined },
    });
    await this.invalidateCache();
    return created;
  }

  async update(id: string, dto: UpdateEducationDto): Promise<Education> {
    await this.findOne(id);
    const updated = await this.prisma.education.update({
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
    await this.prisma.education.delete({ where: { id } });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([this.cache.del(CacheKeys.education), this.cache.del(CacheKeys.site)]);
  }
}
