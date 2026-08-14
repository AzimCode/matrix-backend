import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { StorageService } from '../common/storage/storage.service';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';

type CheckStatus = 'ok' | 'error';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @RawResponse()
  @Get('health')
  @ApiOperation({ summary: 'Liveness/readiness probe for API, database, redis, and storage' })
  async check(@Res() res: Response) {
    const [database, redis, storage] = await Promise.all([
      this.prisma.isHealthy(),
      this.cache.isHealthy(),
      this.storage.isHealthy(),
    ]);

    const toStatus = (ok: boolean): CheckStatus => (ok ? 'ok' : 'error');
    const allHealthy = database && redis && storage;

    res.status(allHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: toStatus(allHealthy),
      database: toStatus(database),
      redis: toStatus(redis),
      storage: toStatus(storage),
    });
  }
}
