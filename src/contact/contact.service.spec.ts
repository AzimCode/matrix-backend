import { Test } from '@nestjs/testing';
import { ContactMessageStatus } from '@prisma/client';
import { ContactService } from './contact.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';

describe('ContactService', () => {
  let service: ContactService;
  let prisma: { contactMessage: Record<string, jest.Mock> };

  const baseDto = { name: 'Jane Doe', email: 'jane@example.com', subject: 'Hello', message: 'A perfectly normal inquiry about your work.' };
  const req = { headers: { 'x-forwarded-for': '203.0.113.5' }, ip: '203.0.113.5', socket: {} } as any;

  beforeEach(async () => {
    prisma = { contactMessage: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() } };
    prisma.contactMessage.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'msg-1', ...data }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppConfigService, useValue: { security: { ipHashPepper: 'test-pepper' } } },
      ],
    }).compile();

    service = moduleRef.get(ContactService);
  });

  it('accepts a normal submission as NEW', async () => {
    const { message, isSpam } = await service.submit(baseDto as any, req);

    expect(isSpam).toBe(false);
    expect(message.status).toBe(ContactMessageStatus.NEW);
  });

  it('stores an optional phone number when the visitor leaves one', async () => {
    await service.submit({ ...baseDto, phone: '+998 90 123-45-67' } as any, req);

    expect(prisma.contactMessage.create.mock.calls[0][0].data.phone).toBe('+998 90 123-45-67');
  });

  it('stores null rather than an empty string when no phone is given', async () => {
    await service.submit(baseDto as any, req);

    expect(prisma.contactMessage.create.mock.calls[0][0].data.phone).toBeNull();
  });

  it('never stores the raw IP address, only a hash', async () => {
    await service.submit(baseDto as any, req);

    const created = prisma.contactMessage.create.mock.calls[0][0].data;
    expect(created.ipHash).not.toContain('203.0.113.5');
    expect(created.ipHash).toHaveLength(64); // sha256 hex
  });

  it('flags a submission with a filled honeypot field as spam', async () => {
    const { isSpam, message } = await service.submit({ ...baseDto, website: 'http://spam.example' } as any, req);

    expect(isSpam).toBe(true);
    expect(message.status).toBe(ContactMessageStatus.SPAM);
  });

  it('flags a submission filled out faster than humanly plausible as spam', async () => {
    const { isSpam } = await service.submit({ ...baseDto, formRenderedAt: Date.now() } as any, req);

    expect(isSpam).toBe(true);
  });

  it('flags a message stuffed with links as spam', async () => {
    const spammyMessage = 'Check http://a.com http://b.com http://c.com http://d.com';
    const { isSpam } = await service.submit({ ...baseDto, message: spammyMessage } as any, req);

    expect(isSpam).toBe(true);
  });
});
