import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppException, ConflictAppException } from '../exceptions/app.exception';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/api/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('formats an AppException using its own code, status, and message', () => {
    const { host, status, json } = makeHost();

    filter.catch(new ConflictAppException('Slug already in use'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'CONFLICT', message: 'Slug already in use' },
    });
  });

  it('flattens class-validator array messages into a details list', () => {
    const { host, status, json } = makeHost();

    filter.catch(new BadRequestException({ message: ['email must be an email', 'password is too short'] }), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ message: 'email must be an email' }, { message: 'password is too short' }],
      },
    });
  });

  it('maps a Prisma unique-constraint violation to 409 CONFLICT without leaking the raw Prisma error', () => {
    const { host, status, json } = makeHost();
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.15.0',
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body.error.code).toBe('CONFLICT');
    expect(JSON.stringify(body)).not.toContain('PrismaClientKnownRequestError');
  });

  it('never leaks internal error details for an unrecognized exception', () => {
    const { host, status, json } = makeHost();

    filter.catch(new Error('a very specific internal stack trace detail'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.error.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(body)).not.toContain('stack trace');
  });

  it('maps a standard NotFoundException to a 404 with a stable code', () => {
    const { host, status, json } = makeHost();

    filter.catch(new NotFoundException('Resource missing'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.code).toBe('NOT_FOUND');
  });
});
