import { Test } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { AppException, NotFoundAppException } from '../common/exceptions/app.exception';

// 1x1 transparent PNG, valid magic bytes + a real (tiny) image body sharp can parse.
const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    prisma = { media: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), delete: jest.fn() } };
    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn().mockReturnValue('https://storage.example/media/file.png'),
    } as unknown as jest.Mocked<StorageService>;

    const moduleRef = await Test.createTestingModule({
      providers: [MediaService, { provide: PrismaService, useValue: prisma }, { provide: StorageService, useValue: storage }],
    }).compile();

    service = moduleRef.get(MediaService);
  });

  it('rejects a file over the 10MB limit before inspecting its content', async () => {
    const oversized = { originalname: 'big.png', mimetype: 'image/png', size: 11 * 1024 * 1024, buffer: Buffer.alloc(10) };

    await expect(service.upload(oversized)).rejects.toThrow(AppException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects a file whose content is not a recognizable image/pdf/svg (disguised executable)', async () => {
    const fakeExe = {
      originalname: 'totally-a-photo.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // MZ header — a Windows executable
    };

    await expect(service.upload(fakeExe)).rejects.toThrow(AppException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects when the declared MIME type does not match the sniffed content type', async () => {
    const buffer = Buffer.from(VALID_PNG_BASE64, 'base64');
    const mislabeled = { originalname: 'photo.pdf', mimetype: 'application/pdf', size: buffer.length, buffer };

    await expect(service.upload(mislabeled)).rejects.toThrow(AppException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('accepts a genuine PNG, extracts dimensions, and stores it', async () => {
    const buffer = Buffer.from(VALID_PNG_BASE64, 'base64');
    prisma.media.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'media-1', ...data }));

    const result = await service.upload({ originalname: 'avatar.png', mimetype: 'image/png', size: buffer.length, buffer });

    expect(storage.upload).toHaveBeenCalled();
    expect(result.mimeType).toBe('image/png');
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('strips <script> tags from uploaded SVGs before storing them', async () => {
    const maliciousSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script><circle r="5"/></svg>',
    );
    prisma.media.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'media-2', ...data }));

    await service.upload({ originalname: 'icon.svg', mimetype: 'image/svg+xml', size: maliciousSvg.length, buffer: maliciousSvg });

    const uploadedBody = (storage.upload as jest.Mock).mock.calls[0][1] as Buffer;
    expect(uploadedBody.toString('utf8')).not.toContain('<script>');
  });

  it('throws NotFoundAppException when deleting a non-existent media item', async () => {
    prisma.media.findUnique.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toThrow(NotFoundAppException);
  });
});
