import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
}

export interface JwtConfig {
  accessSecret: string;
  accessTtl: number;
  refreshSecret: string;
  refreshTtl: number;
}

export interface Argon2Config {
  pepper: string;
}

export interface AppConfig {
  port: number;
  env: string;
  corsOrigins: string[];
  rateLimitReadPerMinute: number;
  rateLimitSubmitPerMinute: number;
}

export interface XApiConfig {
  bearerToken: string;
  baseUrl: string;
}

/**
 * Thin typed wrapper around Nest's ConfigService. Every other module reads
 * config through this, never through `process.env` directly — this is the
 * one place that knows the env var names.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get database(): DatabaseConfig {
    const url = this.config.get<string>("DATABASE_URL");
    if (url) {
      return { url };
    }
    return {
      host: this.config.getOrThrow<string>("DB_HOST"),
      port: this.config.getOrThrow<number>("DB_PORT"),
      username: this.config.getOrThrow<string>("DB_USERNAME"),
      password: this.config.get<string>("DB_PASSWORD") ?? "",
      database: this.config.getOrThrow<string>("DB_NAME"),
    };
  }

  get redis(): RedisConfig {
    const url = this.config.get<string>("REDIS_URL");
    if (url) {
      return { url };
    }
    return {
      host: this.config.getOrThrow<string>("REDIS_HOST"),
      port: this.config.getOrThrow<number>("REDIS_PORT"),
      password: this.config.get<string>("REDIS_PASSWORD"),
    };
  }

  get jwt(): JwtConfig {
    const secret = this.config.getOrThrow<string>("JWT_SIGNING_KEY");
    return {
      accessSecret: secret,
      accessTtl: this.config.getOrThrow<number>("JWT_ACCESS_TOKEN_TTL_SECONDS"),
      refreshSecret: secret,
      refreshTtl: this.config.getOrThrow<number>(
        "JWT_REFRESH_TOKEN_TTL_SECONDS",
      ),
    };
  }

  get argon2(): Argon2Config {
    return {
      pepper: this.config.getOrThrow<string>("ARGON2_PEPPER"),
    };
  }

  get app(): AppConfig {
    const corsOrigin = this.config.getOrThrow<string>("CORS_ORIGIN");
    return {
      port: this.config.getOrThrow<number>("PORT"),
      env: this.config.getOrThrow<string>("NODE_ENV"),
      corsOrigins: corsOrigin.split(",").map((origin) => origin.trim()),
      rateLimitReadPerMinute: this.config.getOrThrow<number>(
        "RATE_LIMIT_READ_PER_MINUTE",
      ),
      rateLimitSubmitPerMinute: this.config.getOrThrow<number>(
        "RATE_LIMIT_SUBMIT_PER_MINUTE",
      ),
    };
  }

  get xApi(): XApiConfig {
    return {
      bearerToken: this.config.get<string>("X_API_BEARER_TOKEN") ?? "",
      baseUrl:
        this.config.get<string>("X_API_BASE_URL") ?? "https://api.twitter.com",
    };
  }
}
