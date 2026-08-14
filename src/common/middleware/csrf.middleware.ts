import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { AppConfigService } from '../../config/app-config.service';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF protection for cookie-authenticated admin routes.
 * Only engages when an access_token cookie is present, so the public,
 * unauthenticated API (profile, projects, contact form, etc.) is unaffected.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const hasSession = Boolean(req.cookies?.access_token || req.cookies?.refresh_token);

    if (!req.cookies?.[CSRF_COOKIE]) {
      res.cookie(CSRF_COOKIE, randomBytes(32).toString('hex'), {
        httpOnly: false,
        secure: this.config.isProduction,
        sameSite: 'strict',
        path: '/',
      });
    }

    if (!hasSession || SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.header(CSRF_HEADER);

    if (!cookieToken || !headerToken || !this.tokensMatch(cookieToken, headerToken)) {
      res.status(403).json({
        success: false,
        error: { code: 'CSRF_TOKEN_INVALID', message: 'Missing or invalid CSRF token' },
      });
      return;
    }

    next();
  }

  private tokensMatch(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
