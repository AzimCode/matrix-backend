import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get the public profile (no private fields)' })
  getProfile() {
    return this.profileService.getPublicProfile();
  }
}
