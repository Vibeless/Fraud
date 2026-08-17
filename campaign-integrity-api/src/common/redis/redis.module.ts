import { Global, Module, OnApplicationShutdown } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
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
        const client = redisConfig.url
          ? new Redis(redisConfig.url, { lazyConnect: false, maxRetriesPerRequest: null })
          : new Redis({
              host: redisConfig.host,
              port: redisConfig.port,
              password: redisConfig.password,
              maxRetriesPerRequest: null,
            });

        client.on("error", () => {
          // Swallow connection errors during teardown
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      const client = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
      if (client && client.status !== "end") {
        await client.quit().catch(() => client.disconnect());
      }
    } catch {
      // Ignored during shutdown
    }
  }
}
