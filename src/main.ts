import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { configureApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(AppConfigService);
  app.useLogger(app.get(Logger));

  configureApp(app);

  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('THE MATRIX — SYSTEM PROFILE API')
      .setDescription('Backend API for an interactive portfolio/CV site')
      .setVersion('1.0.0')
      .addCookieAuth('access_token')
      .addServer('/api')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(config.port);
}

bootstrap();
