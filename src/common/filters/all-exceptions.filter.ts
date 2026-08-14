import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiErrorDetail, ApiErrorResponse } from '../interfaces/api-response.interface';
import { AppException } from '../exceptions/app.exception';

const DEFAULT_CODE = 'INTERNAL_ERROR';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} ${code}: ${message}`);
    }

    const body: ApiErrorResponse = {
      success: false,
      error: { code, message, ...(details?.length ? { details } : {}) },
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const details = this.extractValidationDetails(payload);
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as Record<string, unknown>).message as string) || exception.message;

      return {
        status,
        code: this.codeForStatus(status),
        message: Array.isArray(message) ? 'Validation failed' : message,
        details,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    // Unknown/unexpected error — never leak internals in production.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: DEFAULT_CODE,
      message: 'An unexpected error occurred',
    };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Resource not found',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'DATABASE_ERROR',
          message: 'Database request could not be processed',
        };
    }
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      default:
        return DEFAULT_CODE;
    }
  }

  private extractValidationDetails(payload: unknown): ApiErrorDetail[] | undefined {
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as Record<string, unknown>).message)
    ) {
      return ((payload as Record<string, unknown>).message as string[]).map((m) => ({
        message: m,
      }));
    }
    return undefined;
  }
}
