import { Controller, Get, Res, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { HealthService, HealthCheckResponse } from "./health.service";

/**
 * GET /v1/health — Liveness/readiness probe for load balancers and orchestration.
 * Per API Specification (OAS) §11 and Backend Folder Structure Specification §4.
 *
 * Auth: None (OAS §2, §11 — public unauthenticated endpoint).
 *
 * NOTE ON STATUS CODE POLICY (200 / 503 split):
 * Per Deployment Architecture §4, this endpoint gates traffic at the load balancer,
 * and load balancer / orchestrator health checks key off HTTP status code, not response body.
 * A 200 with a degraded body would look healthy to infra tooling even when it isn't.
 * The body still reports per-dependency detail on failure for human/monitoring consumption,
 * but the status code is what the load balancer acts on.
 */
@Controller("v1/health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthCheckResponse> {
    const response = await this.healthService.checkHealth();

    if (response.status !== "ok") {
      res.status(HttpStatus.SERVICE_UNAVAILABLE); // 503
    } else {
      res.status(HttpStatus.OK); // 200
    }

    return response;
  }
}
