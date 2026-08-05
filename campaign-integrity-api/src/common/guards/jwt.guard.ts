import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AppConfigService } from "../../config/app-config.service";
import { AgencyContext } from "../context/agency-context";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ErrorCode } from "../filters/api-error";

export interface JwtPayload {
  sub: string; // userId
  agencyId: string | null; // null for platform_admin
  role: string;
}

/**
 * Validates `Authorization: Bearer <jwt>` dashboard access tokens per
 * docs/specs/04_Authentication_Authorization_Design_AAD.md §4.
 * Role enforcement itself happens in RolesGuard, which runs after this.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly agencyContext: AgencyContext,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = extractBearerToken(header);

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Missing bearer token.",
      });
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwt.accessSecret,
      });
    } catch {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Invalid or expired session. Refresh or log in again.",
      });
    }

    this.agencyContext.set({
      agencyId: payload.agencyId,
      userId: payload.sub,
      role: payload.role,
      authType: "jwt",
    });
    (request as Request & { agencyContext: AgencyContext }).agencyContext =
      this.agencyContext;

    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}
