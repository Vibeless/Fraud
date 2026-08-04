import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
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

  // --- Database (DATABASE_URL or discrete fields) ---
  @ValidateIf((o) => !o.DB_HOST && !o.DB_PORT && !o.DB_USERNAME && !o.DB_PASSWORD && !o.DB_NAME)
  @IsString()
  @IsNotEmpty()
  DATABASE_URL?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_HOST?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT?: number;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_USERNAME?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  DB_PASSWORD?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DB_NAME?: string;

  // --- Redis (REDIS_URL or discrete fields) ---
  @ValidateIf((o) => !o.REDIS_HOST && !o.REDIS_PORT && !o.REDIS_PASSWORD)
  @IsString()
  @IsNotEmpty()
  REDIS_URL?: string;

  @ValidateIf((o) => !o.REDIS_URL)
  @IsString()
  @IsNotEmpty()
  REDIS_HOST?: string;

  @ValidateIf((o) => !o.REDIS_URL)
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number;

  @ValidateIf((o) => !o.REDIS_URL)
  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // --- Auth ---
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

  // --- X (Twitter) API ---
  @IsString()
  @IsOptional()
  X_API_BEARER_TOKEN?: string;

  @IsString()
  @IsOptional()
  X_API_BASE_URL?: string;

  // --- API key hashing ---
  @IsString()
  @IsNotEmpty()
  API_KEY_PREFIX!: string;

  // --- Rate limiting (per AAD §3.3) ---
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
