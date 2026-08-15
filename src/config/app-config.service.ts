import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

/**
 * Typed facade over ConfigService<AppConfig> so consuming services never
 * touch raw process.env or risk a stringly-typed key typo.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get env(): string {
    return this.config.get('env', { infer: true });
  }

  get isProduction(): boolean {
    return this.env === 'production';
  }

  get port(): number {
    return this.config.get('port', { infer: true });
  }

  get database() {
    return this.config.get('database', { infer: true });
  }

  get redis() {
    return this.config.get('redis', { infer: true });
  }

  get jwt() {
    return this.config.get('jwt', { infer: true });
  }

  get s3() {
    return this.config.get('s3', { infer: true });
  }

  get cors() {
    return this.config.get('cors', { infer: true });
  }

  get rateLimit() {
    return this.config.get('rateLimit', { infer: true });
  }

  get security() {
    return this.config.get('security', { infer: true });
  }

  /** Swagger is on outside production, or wherever SWAGGER_ENABLED is set explicitly. */
  get swaggerEnabled(): boolean {
    return !this.isProduction || this.config.get('swaggerEnabled', { infer: true });
  }

  /** Reverse-proxy hops to trust; 0 means the app is directly reachable. */
  get trustProxy(): number {
    return this.config.get('trustProxy', { infer: true });
  }

  get publicAppUrl(): string | undefined {
    return this.config.get('publicAppUrl', { infer: true });
  }
}
