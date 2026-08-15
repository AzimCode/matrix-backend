export interface AppConfig {
  env: string;
  port: number;
  database: { url: string };
  redis: { url: string };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
    publicUrl?: string;
  };
  cors: { origin: string[] };
  rateLimit: { max: number; windowSeconds: number };
  security: { ipHashPepper: string; cookieSecret: string };
  swaggerEnabled: boolean;
  trustProxy: number;
  publicAppUrl?: string;
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: { url: process.env.DATABASE_URL as string },
  redis: { url: process.env.REDIS_URL as string },
  jwt: {
    accessSecret: process.env.JWT_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT as string,
    region: process.env.S3_REGION ?? 'auto',
    bucket: process.env.S3_BUCKET as string,
    accessKey: process.env.S3_ACCESS_KEY as string,
    secretKey: process.env.S3_SECRET_KEY as string,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    publicUrl: process.env.S3_PUBLIC_URL,
  },
  cors: {
    origin: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW ?? '60', 10),
  },
  security: {
    ipHashPepper: process.env.IP_HASH_PEPPER ?? 'change-me-ip-pepper',
    cookieSecret: process.env.COOKIE_SECRET ?? 'change-me-cookie-secret',
  },
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
  trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10),
  publicAppUrl: process.env.PUBLIC_APP_URL,
});
