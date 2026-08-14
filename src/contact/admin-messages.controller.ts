import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { ContactService } from './contact.service';
import { UpdateMessageStatusDto } from './dto/update-message-status.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin/messages')
@ApiCookieAuth()
@UseGuards(RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/messages')
export class AdminMessagesController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'List contact messages, optionally filtered by status' })
  findAll(@Query() query: MessageQueryDto) {
    return this.contactService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a message and mark it as read' })
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a message status (READ/ARCHIVED/SPAM/NEW)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMessageStatusDto) {
    return this.contactService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a contact message' })
  async remove(@Param('id') id: string) {
    await this.contactService.remove(id);
    return { deleted: true };
  }
}
