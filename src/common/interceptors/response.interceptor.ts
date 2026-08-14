import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

/**
 * Wraps every successful controller response in the project-wide
 * { success: true, data } envelope, unless the handler is annotated
 * with @RawResponse() (streamed files, redirects).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data) => {
        if (isRaw) {
          return data;
        }
        return { success: true, data } as ApiSuccessResponse<T>;
      }),
    );
  }
}
