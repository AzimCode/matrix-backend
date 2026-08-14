import { Injectable } from '@nestjs/common';
import { Certificate } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys } from '../common/cache/cache-keys';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { NotFoundAppException } from '../common/exceptions/app.exception';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async findAll(): Promise<Certificate[]> {
    const cached = await this.cache.get<Certificate[]>(CacheKeys.certificates);
    if (cached) {
      return cached;
    }
    const items = await this.prisma.certificate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { issueDate: 'desc' }],
    });
    await this.cache.set(CacheKeys.certificates, items, CACHE_TTL_MS);
    return items;
  }

  async findOne(id: string): Promise<Certificate> {
    const item = await this.prisma.certificate.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundAppException('Certificate');
    }
    return item;
  }

  async create(dto: CreateCertificateDto): Promise<Certificate> {
    const created = await this.prisma.certificate.create({
      data: { ...dto, issueDate: new Date(dto.issueDate) },
    });
    await this.invalidateCache();
    return created;
  }

  async update(id: string, dto: UpdateCertificateDto): Promise<Certificate> {
    await this.findOne(id);
    const updated = await this.prisma.certificate.update({
      where: { id },
      data: { ...dto, issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined },
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.certificate.delete({ where: { id } });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([this.cache.del(CacheKeys.certificates), this.cache.del(CacheKeys.site)]);
  }
}
