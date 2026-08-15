import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL: string = '15m';

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL: string = '7d';

  @IsString()
  @IsNotEmpty()
  S3_ENDPOINT: string;

  @IsString()
  @IsNotEmpty()
  S3_REGION: string = 'auto';

  @IsString()
  @IsNotEmpty()
  S3_BUCKET: string;

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_KEY: string;

  @IsOptional()
  S3_FORCE_PATH_STYLE: string = 'true';

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsOptional()
  @IsInt()
  RATE_LIMIT_MAX: number = 100;

  @IsOptional()
  @IsInt()
  RATE_LIMIT_WINDOW: number = 60;

  @IsOptional()
  @IsString()
  IP_HASH_PEPPER: string = 'change-me-ip-pepper';

  @IsOptional()
  @IsString()
  COOKIE_SECRET: string = 'change-me-cookie-secret';

  // Lets the local Docker stack expose /docs while still running the
  // production build. Deliberate opt-in: off unless set to 'true'.
  @IsOptional()
  @IsString()
  SWAGGER_ENABLED?: string;

  // Number of reverse proxies in front of the app. Must be set (usually 1)
  // on a PaaS, or every visitor shares one rate-limit bucket. Must stay 0
  // when the app is directly reachable, or X-Forwarded-For can be forged.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY: number = 0;

  @IsOptional()
  @IsUrl({ require_tld: false })
  PUBLIC_APP_URL?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
