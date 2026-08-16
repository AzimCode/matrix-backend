import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AppConfigService } from './config/app-config.service';

/**
 * Shared app configuration (security middleware, CORS, global pipes/prefix)
 * used by both the real server (main.ts) and e2e tests, so tests exercise
 * the exact same request pipeline production traffic goes through.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  // On a PaaS the app sits behind a load balancer, so req.ip would otherwise
  // be the balancer's address — identical for every visitor, which collapses
  // all rate limiting into a single shared bucket. Telling Express how many
  // hops to trust makes it derive the real client IP from X-Forwarded-For,
  // while still refusing to trust that header from a direct connection.
  if (config.trustProxy > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', config.trustProxy);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser(config.security.cookieSecret));

  app.enableCors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  // The admin panel is served from the API's own origin on purpose: the
  // session cookie is SameSite=strict, so a panel hosted on the public site's
  // domain would never have it sent along. Same-origin also means the CSRF
  // double-submit works without loosening anything.
  const express = app as NestExpressApplication;
  if (typeof express.useStaticAssets === 'function') {
    express.useStaticAssets(join(__dirname, 'admin-ui'), { prefix: '/admin' });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
