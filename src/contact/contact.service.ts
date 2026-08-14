import { Injectable, Logger } from '@nestjs/common';
import { ContactMessage, ContactMessageStatus } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { hashWithPepper } from '../common/utils/hash.util';
import { extractClientIp } from '../common/utils/request-ip.util';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateMessageStatusDto } from './dto/update-message-status.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { paginate, Paginated } from '../common/dto/pagination-query.dto';
import { NotFoundAppException } from '../common/exceptions/app.exception';

const MIN_FORM_FILL_MS = 1500; // faster than this is almost certainly a bot
const MAX_LINKS_IN_MESSAGE = 3;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async submit(dto: CreateContactMessageDto, req: Request): Promise<{ message: ContactMessage; isSpam: boolean }> {
    const ip = extractClientIp(req);
    const ipHash = hashWithPepper(ip, this.config.security.ipHashPepper);
    const isSpam = this.detectSpam(dto);

    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        ipHash,
        status: isSpam ? ContactMessageStatus.SPAM : ContactMessageStatus.NEW,
      },
    });

    if (isSpam) {
      this.logger.warn(`Contact submission flagged as spam (ipHash=${ipHash.slice(0, 12)}…)`);
    }

    return { message, isSpam };
  }

  async findAll(query: MessageQueryDto): Promise<Paginated<ContactMessage>> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<ContactMessage> {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundAppException('Message');
    }
    if (message.status === ContactMessageStatus.NEW) {
      return this.prisma.contactMessage.update({ where: { id }, data: { status: ContactMessageStatus.READ } });
    }
    return message;
  }

  async updateStatus(id: string, dto: UpdateMessageStatusDto): Promise<ContactMessage> {
    await this.assertExists(id);
    return this.prisma.contactMessage.update({ where: { id }, data: { status: dto.status } });
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    await this.prisma.contactMessage.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundAppException('Message');
    }
  }

  private detectSpam(dto: CreateContactMessageDto): boolean {
    if (dto.website && dto.website.trim().length > 0) {
      return true; // honeypot triggered
    }
    if (dto.formRenderedAt && Date.now() - dto.formRenderedAt < MIN_FORM_FILL_MS) {
      return true; // submitted too fast to be human
    }
    const linkCount = (dto.message.match(/https?:\/\//gi) ?? []).length;
    if (linkCount > MAX_LINKS_IN_MESSAGE) {
      return true;
    }
    return false;
  }
}
