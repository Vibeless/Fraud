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
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { IntelligenceModule } from "./modules/intelligence/intelligence.module";
import { DetectionModule } from "./modules/detection/detection.module";
import { QueueModule } from "./queue/queue.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { AuditModule } from "./modules/audit/audit.module";

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
    ApiKeysModule,
    CampaignsModule,
    IntelligenceModule,
    DetectionModule,
    QueueModule,
    SubmissionsModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
