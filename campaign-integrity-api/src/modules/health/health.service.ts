import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ANALYSIS_QUEUE } from "../../queue/queue.constants";

export type DependencyStatus = "ok" | "error";

export interface HealthCheckResponse {
  status: "ok" | "error";
  version: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    queue: DependencyStatus;
  };
}

// Read version dynamically from package.json at boot per OAS §11 / Backend Folder Structure §4
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkgJson = require("../../../package.json");
const PACKAGE_VERSION: string = pkgJson.version ?? "0.1.0";

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue(ANALYSIS_QUEUE) private readonly queue: Queue,
  ) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const [database, redis, queue] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const dependencies = { database, redis, queue };
    const overallOk = database === "ok" && redis === "ok" && queue === "ok";

    return {
      status: overallOk ? "ok" : "error",
      version: PACKAGE_VERSION,
      dependencies,
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    return this.withTimeout(async () => {
      await this.dataSource.query("SELECT 1");
      return "ok";
    }, 2000);
  }

  private async checkRedis(): Promise<DependencyStatus> {
    return this.withTimeout(async () => {
      const client = (await this.queue.client) as unknown as {
        ping(): Promise<string>;
      };
      const res = await client.ping();
      return res === "PONG" ? "ok" : "error";
    }, 2000);
  }

  private async checkQueue(): Promise<DependencyStatus> {
    return this.withTimeout(async () => {
      await this.queue.waitUntilReady();
      await this.queue.getJobCounts();
      return "ok";
    }, 2000);
  }

  private async withTimeout(
    fn: () => Promise<DependencyStatus>,
    timeoutMs = 2000,
  ): Promise<DependencyStatus> {
    try {
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<DependencyStatus>((resolve) => {
        timer = setTimeout(() => resolve("error"), timeoutMs);
      });

      const result = await Promise.race([
        fn().catch(() => "error" as DependencyStatus),
        timeoutPromise,
      ]);

      clearTimeout(timer!);
      return result;
    } catch {
      return "error";
    }
  }
}
