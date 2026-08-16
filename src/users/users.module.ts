import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminBootstrapService } from './admin-bootstrap.service';

@Module({
  controllers: [AdminUsersController],
  providers: [UsersService, AdminBootstrapService],
  exports: [UsersService],
})
export class UsersModule {}
