import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ApiKeyGuard } from "./api-key.guard";
import { JwtGuard } from "./jwt.guard";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * For the handful of routes the API Specification marks as
 * "Auth: API key or dashboard JWT" (e.g. GET /v1/submissions,
 * GET /v1/campaigns). Delegates to whichever concrete guard matches the
 * bearer token's shape, so the validation logic itself lives in exactly
 * one place per credential type.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly apiKeyGuard: ApiKeyGuard,
    private readonly jwtGuard: JwtGuard,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? "";
    const [, token] = header.split(" ");

    if (token?.startsWith("ci_")) {
      return this.apiKeyGuard.canActivate(context);
    }
    return this.jwtGuard.canActivate(context);
  }
}
