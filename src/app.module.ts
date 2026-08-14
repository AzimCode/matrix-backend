import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-yet';
import { LoggerModule } from 'nestjs-pino';

import { ConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { ExperienceModule } from './experience/experience.module';
import { ProjectsModule } from './projects/projects.module';
import { SkillsModule } from './skills/skills.module';
import { EducationModule } from './education/education.module';
import { CertificatesModule } from './certificates/certificates.module';
import { ResumeModule } from './resume/resume.module';
import { ContactModule } from './contact/contact.module';
import { MediaModule } from './media/media.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { SiteModule } from './site/site.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,

    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.isProduction ? 'info' : 'debug',
          autoLogging: true,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.message',
              'req.body.email',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [AppConfigService],
      useFactory: async (config: AppConfigService) => ({
        store: await redisStore({ url: config.redis.url, ttl: 5 * 60 * 1000 }),
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [{ ttl: config.rateLimit.windowSeconds * 1000, limit: config.rateLimit.max }],
      }),
    }),

    PrismaModule,
    StorageModule,

    AuthModule,
    UsersModule,
    ProfileModule,
    ExperienceModule,
    ProjectsModule,
    SkillsModule,
    EducationModule,
    CertificatesModule,
    ResumeModule,
    ContactModule,
    MediaModule,
    AnalyticsModule,
    AdminModule,
    SiteModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
