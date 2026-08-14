import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { AdminMediaController } from './admin-media.controller';

@Module({
  controllers: [AdminMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
