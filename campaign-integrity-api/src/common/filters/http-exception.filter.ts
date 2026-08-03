import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorBody, ErrorCode } from './api-error';

/**
 * Every thrown exception passes through here and comes out as the
 * standard { error: { code, message, details } } shape (OAS §3) — no
 * endpoint should construct its own error body.
 *
 * Also the enforcement point for "secrets are never logged, including in
 * error stack traces" (AGENTS.md non-negotiable #4): unexpected 5xx
 * errors are logged server-side with the stack trace, but the response
 * body sent to the caller never includes it.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected error occurred.';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        code = (b.code as string) ?? defaultCodeForStatus(status);
        message = (b.message as string) ?? exception.message;
        details = (b.details as Record<string, unknown>) ?? undefined;
        // class-validator's ValidationPipe puts an array of strings in `message`
        if (Array.isArray(b.message)) {
          message = 'Request validation failed.';
          details = { errors: b.message };
        }
      } else {
        message = String(body);
        code = defaultCodeForStatus(status);
      }
    } else if (exception instanceof Error) {
      // Unexpected error: log full detail server-side, never leak it to the caller.
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    const body: ApiErrorBody = { error: { code, message, ...(details ? { details } : {}) } };
    response.status(status).json(body);
  }
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.DUPLICATE_SUBMISSION;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorCode.ANALYSIS_FAILED;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}
