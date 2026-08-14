import { HttpStatus, Injectable } from '@nestjs/common';
import { Resume } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys } from '../common/cache/cache-keys';
import { AppException, NotFoundAppException } from '../common/exceptions/app.exception';

const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly cache: AppCacheService,
  ) {}

  async getActive(): Promise<Resume> {
    const cached = await this.cache.get<Resume>(CacheKeys.resume);
    if (cached) {
      return cached;
    }
    const resume = await this.prisma.resume.findFirst({ where: { active: true }, orderBy: { uploadedAt: 'desc' } });
    if (!resume) {
      throw new NotFoundAppException('Resume');
    }
    await this.cache.set(CacheKeys.resume, resume, CACHE_TTL_MS);
    return resume;
  }

  async getActiveDownloadUrl(): Promise<{ url: string; version: string }> {
    const resume = await this.getActive();
    const url = await this.storage.getSignedDownloadUrl(resume.storageKey, 300);
    return { url, version: resume.version };
  }

  async listAll(): Promise<Resume[]> {
    return this.prisma.resume.findMany({ orderBy: { uploadedAt: 'desc' } });
  }

  async uploadNewVersion(file: { buffer: Buffer; mimetype: string; size: number }, version: string): Promise<Resume> {
    this.assertValidPdf(file);

    const storageKey = `resumes/${randomUUID()}.pdf`;
    await this.storage.upload(storageKey, file.buffer, 'application/pdf');
    const fileUrl = this.storage.publicUrl(storageKey);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.resume.updateMany({ where: { active: true }, data: { active: false } });
      return tx.resume.create({
        data: { fileUrl, storageKey, version, active: true },
      });
    });

    await this.invalidateCache();
    return created;
  }

  async activate(id: string): Promise<Resume> {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume) {
      throw new NotFoundAppException('Resume');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.resume.updateMany({ where: { active: true }, data: { active: false } });
      return tx.resume.update({ where: { id }, data: { active: true } });
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume) {
      throw new NotFoundAppException('Resume');
    }
    if (resume.active) {
      throw new AppException(
        'CANNOT_DELETE_ACTIVE_RESUME',
        'Activate a different version before deleting the active resume',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.resume.delete({ where: { id } });
    await this.storage.delete(resume.storageKey);
    await this.invalidateCache();
  }

  private assertValidPdf(file: { mimetype: string; size: number }): void {
    if (file.mimetype !== 'application/pdf') {
      throw new AppException('INVALID_FILE_TYPE', 'Resume must be a PDF file', HttpStatus.BAD_REQUEST);
    }
    if (file.size > MAX_RESUME_BYTES) {
      throw new AppException('FILE_TOO_LARGE', 'Resume file exceeds the 10MB limit', HttpStatus.PAYLOAD_TOO_LARGE);
    }
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([this.cache.del(CacheKeys.resume), this.cache.del(CacheKeys.site)]);
  }
}
