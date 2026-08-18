import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_DESCRIPTION, PASSWORD_MAX_LENGTH } from './password.rules';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The password currently in use, to prove the session is yours.' })
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword: string;

  @ApiProperty({ description: PASSWORD_DESCRIPTION })
  @IsStrongPassword('newPassword')
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: PASSWORD_DESCRIPTION })
  @IsStrongPassword('newPassword')
  newPassword: string;
}
