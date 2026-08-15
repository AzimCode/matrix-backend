import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The password currently in use, to prove the session is yours.' })
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({
    description:
      'At least 12 characters, with a lowercase letter, an uppercase letter, and a digit.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'newPassword must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'newPassword must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'newPassword must contain a digit' })
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description:
      'At least 12 characters, with a lowercase letter, an uppercase letter, and a digit.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'newPassword must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'newPassword must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'newPassword must contain a digit' })
  newPassword: string;
}
