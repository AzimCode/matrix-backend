import { HttpStatus, Injectable } from '@nestjs/common';
import { Media } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { AppException, NotFoundAppException } from '../common/exceptions/app.exception';
import { detectFileType } from '../common/utils/file-signature.util';
import { sanitizeFilename, extensionFor } from '../common/utils/filename.util';
import { sanitizeSvg } from '../common/utils/svg-sanitize.util';
import { paginate, Paginated, PaginationQueryDto } from '../common/dto/pagination-query.dto';

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']);

export interface IncomingFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(file: IncomingFile): Promise<Media> {
    if (file.size > MAX_MEDIA_BYTES) {
      throw new AppException('FILE_TOO_LARGE', 'File exceeds the 10MB limit', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    const detected = detectFileType(file.buffer);
    if (!detected || !ALLOWED_TYPES.has(detected)) {
      throw new AppException(
        'INVALID_FILE_TYPE',
        'Only JPEG, PNG, WEBP, SVG, and PDF files are allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (detected !== file.mimetype) {
      // Declared MIME must match the sniffed content type — blocks disguised executables.
      throw new AppException(
        'MIME_MISMATCH',
        'The file content does not match its declared type',
        HttpStatus.BAD_REQUEST,
      );
    }

    let body = file.buffer;
    let width: number | undefined;
    let height: number | undefined;

    if (detected === 'image/svg+xml') {
      body = Buffer.from(sanitizeSvg(file.buffer.toString('utf8')), 'utf8');
    } else if (detected === 'image/jpeg' || detected === 'image/png' || detected === 'image/webp') {
      try {
        const meta = await sharp(file.buffer).metadata();
        width = meta.width;
        height = meta.height;
      } catch {
        throw new AppException('INVALID_IMAGE', 'The uploaded file is not a valid image', HttpStatus.BAD_REQUEST);
      }
    }

    const safeName = sanitizeFilename(file.originalname);
    const storageKey = `media/${randomUUID()}${extensionFor(detected)}`;
    await this.storage.upload(storageKey, body, detected);

    return this.prisma.media.create({
      data: {
        filename: safeName,
        mimeType: detected,
        size: body.length,
        url: this.storage.publicUrl(storageKey),
        storageKey,
        width,
        height,
      },
    });
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<Media>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.media.count(),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async remove(id: string): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundAppException('Media');
    }
    await this.prisma.media.delete({ where: { id } });
    await this.storage.delete(media.storageKey);
  }
}
