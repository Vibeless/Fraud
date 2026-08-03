import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../database/entities';
import { AgencyContext } from '../context/agency-context';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { ErrorCode } from '../filters/api-error';

/**
 * For routes reachable by EITHER an API key or a dashboard JWT (e.g.
 * GET/POST /v1/campaigns, GET /v1/submissions) — see
 * docs/specs/02_API_Specification_OAS.md §6-7.
 *
 * ApiKeyGuard already checks @RequireScopes() and JwtGuard's sibling
 * RolesGuard already checks @Roles(), but neither runs the OTHER route's
 * check — a route behind AuthGuard alone that only declares
 * @RequireScopes(...) has no role enforcement at all for JWT callers.
 * This guard closes that gap: it applies whichever check matches how the
 * caller actually authenticated, using AgencyContext already populated by
 * AuthGuard/ApiKeyGuard/JwtGuard earlier in the guard chain.
 *
 * Always pair @RequireScopes(...) AND @Roles(...) on a dual-auth route so
 * both credential types are actually restricted — see
 * .agents/rules/20-security.md.
 */
@Injectable()
export class ScopesOrRolesGuard implements CanActivate {
  constructor(
    private readonly agencyContext: AgencyContext,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (this.agencyContext.authType === 'api_key') {
      if (!requiredScopes?.length) return true; // no scope requirement declared for this route
      const hasScope = requiredScopes.some((s) => this.agencyContext.scopes.includes(s));
      if (!hasScope) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: `This API key is missing a required scope: one of [${requiredScopes.join(', ')}].`,
        });
      }
      return true;
    }

    // JWT caller
    if (!requiredRoles?.length) return true; // no role requirement declared for this route
    const role = this.agencyContext.role as UserRole | null;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Your role does not have access to this action.',
      });
    }
    return true;
  }
}
