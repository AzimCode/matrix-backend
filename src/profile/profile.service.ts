import { Injectable } from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys } from '../common/cache/cache-keys';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PublicProfile, toPublicProfile } from './profile.mapper';

export const PROFILE_SINGLETON_ID = 'profile-singleton';
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async getPublicProfile(): Promise<PublicProfile> {
    const cached = await this.cache.get<PublicProfile>(CacheKeys.profile);
    if (cached) {
      return cached;
    }
    const profile = await this.getOrCreate();
    const publicProfile = toPublicProfile(profile);
    await this.cache.set(CacheKeys.profile, publicProfile, CACHE_TTL_MS);
    return publicProfile;
  }

  async getFullProfile(): Promise<Profile> {
    return this.getOrCreate();
  }

  async updateProfile(dto: UpdateProfileDto): Promise<Profile> {
    const existing = await this.getOrCreate();

    const updated = await this.prisma.profile.update({
      where: { id: existing.id },
      data: {
        ...dto,
        socialLinks: dto.socialLinks
          ? { ...(existing.socialLinks as Record<string, string>), ...dto.socialLinks }
          : undefined,
      },
    });

    await this.invalidateCache();
    return updated;
  }

  private async getOrCreate(): Promise<Profile> {
    const existing = await this.prisma.profile.findUnique({ where: { id: PROFILE_SINGLETON_ID } });
    if (existing) {
      return existing;
    }
    return this.prisma.profile.create({
      data: {
        id: PROFILE_SINGLETON_ID,
        name: 'Unnamed',
        headline: 'Set up your headline in the admin panel',
        bio: '',
      },
    });
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([this.cache.del(CacheKeys.profile), this.cache.del(CacheKeys.site), this.cache.del(CacheKeys.systemStatus)]);
  }
}
