import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from "class-validator";

/**
 * Every environment variable the app depends on is declared here and
 * validated at boot. If a required value is missing or malformed, the
 * process fails fast on startup instead of failing confusingly later at
 * request time. Never read `process.env` directly outside this file —
 * inject `ConfigService` and go through the typed getters instead.
 */
class EnvironmentVariables {
  @IsIn(["development", "test", "staging", "production"])
  NODE_ENV!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SIGNING_KEY!: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_TOKEN_TTL_SECONDS!: number;

  @IsInt()
  @Min(3600)
  JWT_REFRESH_TOKEN_TTL_SECONDS!: number;

  @IsString()
  @IsNotEmpty()
  ARGON2_PEPPER!: string;

  @IsString()
  @IsNotEmpty()
  API_KEY_PREFIX!: string;

  @IsInt()
  @Min(1)
  RATE_LIMIT_READ_PER_MINUTE!: number;

  @IsInt()
  @Min(1)
  RATE_LIMIT_SUBMIT_PER_MINUTE!: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(", "))
      .join("\n");
    throw new Error(
      `Invalid environment configuration — refusing to start:\n${messages}`,
    );
  }

  return validated;
}
