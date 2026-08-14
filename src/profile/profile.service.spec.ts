import { Test } from '@nestjs/testing';
import { ProfileService, PROFILE_SINGLETON_ID } from './profile.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: { profile: Record<string, jest.Mock> };
  let cache: jest.Mocked<AppCacheService>;

  const fullProfile = {
    id: PROFILE_SINGLETON_ID,
    name: 'Alexander Ivanov',
    headline: 'Product Designer',
    location: 'Tashkent',
    bio: 'Bio text',
    avatarUrl: null,
    email: 'contact@example.com',
    phone: '+998900000000',
    website: 'https://example.com',
    socialLinks: { github: 'https://github.com/example' },
    availability: 'AVAILABLE',
    systemStatus: 'ONLINE',
    accentColor: '#00ff41',
    profileVersion: '1.0.0',
    terminalMessages: ['ACCESS GRANTED'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = { profile: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<AppCacheService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppCacheService, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
  });

  it('never exposes the phone number in the public profile', async () => {
    prisma.profile.findUnique.mockResolvedValue(fullProfile);

    const publicProfile = await service.getPublicProfile();

    expect(publicProfile).not.toHaveProperty('phone');
    expect(publicProfile.name).toBe(fullProfile.name);
    expect(publicProfile.email).toBe(fullProfile.email);
  });

  it('serves the public profile from cache when present, skipping the database', async () => {
    cache.get.mockResolvedValueOnce({ name: 'Cached Name' } as any);

    const result = await service.getPublicProfile();

    expect(result).toEqual({ name: 'Cached Name' });
    expect(prisma.profile.findUnique).not.toHaveBeenCalled();
  });

  it('creates the singleton profile row on first access if none exists', async () => {
    prisma.profile.findUnique.mockResolvedValue(null);
    prisma.profile.create.mockResolvedValue(fullProfile);

    await service.getFullProfile();

    expect(prisma.profile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: PROFILE_SINGLETON_ID }) }),
    );
  });

  it('invalidates the profile cache after an update', async () => {
    prisma.profile.findUnique.mockResolvedValue(fullProfile);
    prisma.profile.update.mockResolvedValue({ ...fullProfile, name: 'Updated Name' });

    await service.updateProfile({ name: 'Updated Name' });

    expect(cache.del).toHaveBeenCalled();
  });
});
