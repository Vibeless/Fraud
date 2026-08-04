import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppConfigModule } from "./config/config.module";
import { AppConfigService } from "./config/app-config.service";
import { DatabaseModule } from "./database/database.module";
import { CommonModule } from "./common/common.module";
import { RedisModule } from "./common/redis/redis.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SubmissionsModule } from "./modules/submissions/submissions.module";
import { IntelligenceModule } from "./modules/intelligence/intelligence.module";
import { DetectionModule } from "./modules/detection/detection.module";
import { QueueModule } from "./queue/queue.module";

/**
 * TRIMMED STARTER STATE: this is the minimal vertical slice — health,
 * auth, and the full submissions -> detection pipeline (collect ->
 * validate -> one rule -> aggregate -> evidence) — proven to build,
 * typecheck, and run against a real Postgres + Redis. campaigns,
 * api-keys, and audit-log-viewing are NOT yet built as feature modules;
 * their entities/tables already exist (see the migration) and this is
 * intentionally where you build them next. See AGENTS.md and
 * .agents/skills/add-api-endpoint/SKILL.md.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: [".env"],
    }),
    AppConfigModule,
    RedisModule,
    DatabaseModule,
    CommonModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            name: "default",
            ttl: 60_000,
            limit: config.app.rateLimitReadPerMinute,
          },
        ],
      }),
    }),
    HealthModule,
    AuthModule,
    IntelligenceModule,
    DetectionModule,
    QueueModule,
    SubmissionsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
