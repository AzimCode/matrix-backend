import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { configureApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const config = app.get(AppConfigService);
  app.useLogger(app.get(Logger));

  configureApp(app);

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('THE MATRIX — SYSTEM PROFILE API')
      .setDescription('Backend API for an interactive portfolio/CV site')
      .setVersion('1.0.0')
      .addCookieAuth('access_token')
      .addServer('/api')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        // Admin routes are cookie-authenticated, so the CSRF middleware
        // demands a matching X-CSRF-Token header on writes. Swagger UI has no
        // idea about that, which would make every admin POST/PATCH/DELETE fail
        // with CSRF_TOKEN_INVALID. Mirroring the csrf_token cookie into the
        // header here is exactly the double-submit check the middleware does,
        // so "Try it out" works without weakening the protection.
        // Serialized and re-evaluated inside Swagger UI, so it must not close
        // over anything from this module.
        requestInterceptor: (req: { headers: Record<string, string> }) => {
          const cookie =
            (globalThis as unknown as { document?: { cookie: string } }).document?.cookie ?? '';
          const match = /(?:^|;\s*)csrf_token=([^;]+)/.exec(cookie);
          if (match) {
            req.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
          }
          return req;
        },
        withCredentials: true,
        persistAuthorization: true,
      },
    });
  }

  app.enableShutdownHooks();

  await app.listen(config.port);
}

bootstrap();
