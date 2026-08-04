import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as argon2 from "argon2";
import { randomBytes, createHash } from "crypto";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../../common/redis/redis.module";
import { AppConfigService } from "../../config/app-config.service";
import {
  AuditActorType,
  AuditLog,
  User,
  UserStatus,
} from "../../database/entities";
import { ErrorCode } from "../../common/filters/api-error";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const REFRESH_KEY_PREFIX = "auth:refresh:";
const REFRESH_USER_INDEX_PREFIX = "auth:refresh:user:";

/**
 * Implements the token flow in
 * docs/specs/04_Authentication_Authorization_Design_AAD.md §4.1.
 *
 * Refresh tokens are opaque random values, stored server-side as a hash
 * in Redis with a TTL matching JWT_REFRESH_TOKEN_TTL_SECONDS, and rotated
 * on every use — the old token is deleted the moment a new one is issued.
 * (This is intentionally not a `refresh_tokens` Postgres table: it's
 * ephemeral session state, a natural fit for Redis, which is already in
 * the architecture for exactly this kind of TTL'd data. If you'd rather
 * have it in Postgres for durability across a Redis flush, that's a
 * reasonable change — just update DDS §4 to document the new table.)
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async login(
    email: string,
    password: string,
    ip: string | null,
  ): Promise<TokenPair & { user: Partial<User> }> {
    const user = await this.users.findOne({
      where: { email },
      select: ["id", "agencyId", "email", "passwordHash", "role", "status"],
    });

    const passwordOk = user
      ? await argon2.verify(user.passwordHash, password)
      : false;

    if (!user || !passwordOk || user.status !== UserStatus.ACTIVE) {
      await this.recordAuthEvent(
        null,
        user?.agencyId ?? null,
        "auth.login_failed",
        ip,
        {
          email,
        },
      );
      // Same generic message regardless of which check failed — never
      // reveal whether the email exists (DUXS §4.1).
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Invalid email or password.",
      });
    }

    const tokens = await this.issueTokenPair(user);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    await this.recordAuthEvent(
      user.id,
      user.agencyId,
      "auth.login_succeeded",
      ip,
      null,
    );

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<Pick<TokenPair, "accessToken" | "expiresIn">> {
    const hash = hashToken(refreshToken);
    const raw = await this.redis.get(REFRESH_KEY_PREFIX + hash);
    if (!raw) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Refresh token is invalid or has expired.",
      });
    }
    const { userId } = JSON.parse(raw) as { userId: string };
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Account is no longer active.",
      });
    }

    // Rotate: invalidate the used token before issuing a new pair.
    await this.redis.del(REFRESH_KEY_PREFIX + hash);
    await this.redis.srem(REFRESH_USER_INDEX_PREFIX + userId, hash);

    const tokens = await this.issueTokenPair(user);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  async logoutAllSessions(userId: string): Promise<void> {
    const hashes = await this.redis.smembers(
      REFRESH_USER_INDEX_PREFIX + userId,
    );
    if (hashes.length) {
      await this.redis.del(...hashes.map((h) => REFRESH_KEY_PREFIX + h));
    }
    await this.redis.del(REFRESH_USER_INDEX_PREFIX + userId);
    await this.recordAuthEvent(userId, null, "auth.logout", null, null);
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, agencyId: user.agencyId, role: user.role },
      { expiresIn: this.config.jwtAccessTokenTtlSeconds },
    );

    const refreshToken = randomBytes(32).toString("base64url");
    const hash = hashToken(refreshToken);
    const ttl = this.config.jwtRefreshTokenTtlSeconds;

    await this.redis.set(
      REFRESH_KEY_PREFIX + hash,
      JSON.stringify({ userId: user.id }),
      "EX",
      ttl,
    );
    await this.redis.sadd(REFRESH_USER_INDEX_PREFIX + user.id, hash);
    await this.redis.expire(REFRESH_USER_INDEX_PREFIX + user.id, ttl);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtAccessTokenTtlSeconds,
    };
  }

  private async recordAuthEvent(
    actorId: string | null,
    agencyId: string | null,
    action: string,
    ip: string | null,
    metadata: Record<string, unknown> | null,
  ) {
    await this.auditLogs.insert({
      agencyId,
      actorType: AuditActorType.USER,
      actorId,
      action,
      resourceType: "user",
      resourceId: actorId,
      // TypeORM's QueryDeepPartialEntity mapped type doesn't accept a
      // plain Record<string, unknown> for a jsonb column directly — a
      // known TypeORM+strict-mode limitation, not a real type mismatch.

      metadata: metadata as any,
      ipAddress: ip,
    });
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
