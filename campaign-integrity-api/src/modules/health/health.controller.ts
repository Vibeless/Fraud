import { Controller, Get, Inject } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import Redis from "ioredis";
import { Public } from "../../common/decorators/public.decorator";
import { REDIS_CLIENT } from "../../common/redis/redis.module";

type DependencyStatus = "ok" | "error";

/** GET /v1/health — docs/specs/02_API_Specification_OAS.md §11. */
@Controller("v1/health")
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  async check() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dependencies: Record<string, DependencyStatus> = {
      database,
      redis,
      queue: redis,
    };
    const overallOk = Object.values(dependencies).every((s) => s === "ok");

    return {
      status: overallOk ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      dependencies,
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query("SELECT 1");
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.redis.ping();
      return "ok";
    } catch {
      return "error";
    }
  }
}
