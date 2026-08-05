import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { AppConfigModule } from "../../config/config.module";
import { AppConfigService } from "../../config/app-config.service";

export const REDIS_CLIENT = "REDIS_CLIENT";

/**
 * One shared ioredis connection for the whole process - used for the
 * cache and session/refresh-token storage. BullMQ manages its own
 * connection using the same REDIS_URL for the job queue. See
 * docs/specs/08_Deployment_Architecture.md §5.
 */
@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const redisConfig = config.redis;
        if (redisConfig.url) {
          return new Redis(redisConfig.url);
        }
        return new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
