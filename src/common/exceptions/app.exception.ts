import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorDetail } from '../interfaces/api-response.interface';

/**
 * Base exception carrying a stable machine-readable `code` alongside
 * the human-readable message, so clients can branch on `error.code`
 * instead of parsing message strings.
 */
export class AppException extends HttpException {
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: ApiErrorDetail[],
  ) {
    super(message, status);
    this.code = code;
    this.details = details;
  }
}

export class NotFoundAppException extends AppException {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ConflictAppException extends AppException {
  constructor(message: string) {
    super('CONFLICT', message, HttpStatus.CONFLICT);
  }
}

export class UnauthorizedAppException extends AppException {
  constructor(message = 'Invalid credentials') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class AccountLockedException extends AppException {
  constructor(retryAfterSeconds: number) {
    super(
      'ACCOUNT_LOCKED',
      `Account temporarily locked due to failed login attempts. Try again in ${retryAfterSeconds}s.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
