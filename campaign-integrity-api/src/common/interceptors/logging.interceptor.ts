import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "crypto";

/**
 * Generates (or propagates) a correlationId per request and logs
 * method/path/status/duration/callerType/agencyId as structured JSON, per
 * docs/specs/09_Logging_Monitoring_Strategy.md §2-3.
 *
 * Never logs the raw API key or JWT - only agencyId, and only after a
 * guard has resolved it. If a request fails auth, agencyId won't be set
 * yet and is omitted, which is correct: an unauthenticated request has no
 * agency to attribute the log line to.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers["x-correlation-id"] as string) || randomUUID();
    (request as Request & { correlationId: string }).correlationId =
      correlationId;
    response.setHeader("x-correlation-id", correlationId);

    const start = Date.now();
    const authHeader = request.headers.authorization;
    const callerType = !authHeader
      ? "none"
      : authHeader.includes("ci_")
        ? "api_key"
        : "jwt";

    return next.handle().pipe(
      tap({
        next: () =>
          this.log(request, response, start, correlationId, callerType),
        error: () =>
          this.log(request, response, start, correlationId, callerType),
      }),
    );
  }

  private log(
    request: Request,
    response: Response,
    start: number,
    correlationId: string,
    callerType: string,
  ) {
    const agencyId = (
      request as Request & { agencyContext?: { agencyId?: string } }
    ).agencyContext?.agencyId;
    this.logger.log(
      JSON.stringify({
        correlationId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - start,
        callerType,
        agencyId: agencyId ?? undefined,
      }),
    );
  }
}
