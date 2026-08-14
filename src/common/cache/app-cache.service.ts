import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Thin wrapper around cache-manager so services depend on a single
 * injectable instead of the raw CACHE_MANAGER token, and so cache
 * failures (e.g. Redis briefly unavailable) never break a request —
 * they're logged and treated as a cache miss.
 */
@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(key);
    } catch (err) {
      this.logger.warn(`Cache GET failed for ${key}: ${(err as Error).message}`);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttlMs);
    } catch (err) {
      this.logger.warn(`Cache SET failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(`Cache DEL failed for ${key}: ${(err as Error).message}`);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      // cache-manager-redis-yet (v5) wraps the `redis` (node-redis v4) client,
      // exposed via store.client. Its del() takes a single array argument —
      // NOT variadic like ioredis — so spreading here would silently drop
      // every key past the first.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = (this.cache as any)?.store?.client;
      if (!client?.keys) {
        return;
      }
      const keys: string[] = await client.keys(`${prefix}*`);
      if (keys.length) {
        await client.del(keys);
      }
    } catch (err) {
      this.logger.warn(`Cache DEL by prefix failed for ${prefix}: ${(err as Error).message}`);
    }
  }

  async reset(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.cache as any).reset?.();
    } catch (err) {
      this.logger.warn(`Cache reset failed: ${(err as Error).message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = (this.cache as any)?.store?.client;
      if (client?.ping) {
        await client.ping();
        return true;
      }
      const probeKey = '__healthcheck__';
      await this.cache.set(probeKey, '1', 5000);
      return (await this.cache.get(probeKey)) === '1';
    } catch {
      return false;
    }
  }
}
