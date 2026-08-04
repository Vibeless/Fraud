import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Thin typed wrapper around Nest's ConfigService. Every other module reads
 * config through this, never through `process.env` directly — this is the
 * one place that knows the env var names.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.getOrThrow<string>("NODE_ENV");
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get port(): number {
    return this.config.getOrThrow<number>("PORT");
  }

  get corsOrigin(): string {
    return this.config.getOrThrow<string>("CORS_ORIGIN");
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>("DATABASE_URL");
  }

  get redisUrl(): string {
    return this.config.getOrThrow<string>("REDIS_URL");
  }

  get jwtSigningKey(): string {
    return this.config.getOrThrow<string>("JWT_SIGNING_KEY");
  }

  get jwtAccessTokenTtlSeconds(): number {
    return this.config.getOrThrow<number>("JWT_ACCESS_TOKEN_TTL_SECONDS");
  }

  get jwtRefreshTokenTtlSeconds(): number {
    return this.config.getOrThrow<number>("JWT_REFRESH_TOKEN_TTL_SECONDS");
  }

  get argon2Pepper(): string {
    return this.config.getOrThrow<string>("ARGON2_PEPPER");
  }

  get apiKeyPrefix(): string {
    return this.config.getOrThrow<string>("API_KEY_PREFIX");
  }

  get rateLimitReadPerMinute(): number {
    return this.config.getOrThrow<number>("RATE_LIMIT_READ_PER_MINUTE");
  }

  get rateLimitSubmitPerMinute(): number {
    return this.config.getOrThrow<number>("RATE_LIMIT_SUBMIT_PER_MINUTE");
  }
}
