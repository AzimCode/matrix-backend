import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ResetPasswordDto } from './dto/change-password.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

/**
 * Managing who can sign in is ADMIN-only — an EDITOR can change site content
 * but must not be able to grant itself more access or lock the owner out.
 */
@ApiTags('admin/users')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List admin users (never includes password hashes)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an admin or editor account' })
  create(@Body() dto: CreateAdminUserDto) {
    return this.usersService.create(dto.email, dto.password, dto.role ?? AdminRole.EDITOR);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Change a user's role" })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, dto.role, actor.sub);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: "Reset another user's password; signs them out everywhere" })
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    await this.usersService.resetPassword(id, dto.newPassword);
    return { updated: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an admin user' })
  async remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.usersService.remove(id, actor.sub);
    return { deleted: true };
  }
}
