import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../database/entities";
import { AgencyContext } from "../context/agency-context";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { ErrorCode } from "../filters/api-error";

/**
 * Route-level RBAC check against the permission matrix in
 * docs/specs/04_Authentication_Authorization_Design_AAD.md §5.2. Runs
 * after JwtGuard (or AuthGuard) has already populated AgencyContext.
 *
 * This is layer one of the two-layer enforcement AAD §5.2 describes —
 * "is this role allowed to call this endpoint at all." Layer two — "does
 * this token's agencyId match the resource's agency_id" — is NOT this
 * guard's job; that's a resource-level check in the service, using
 * AgencyContext.agencyId in every query. A route passing RolesGuard does
 * not mean a service is allowed to skip agency scoping.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly agencyContext: AgencyContext,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() declared is a bug, not "allow everyone" — fail closed.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message:
          "This route has no roles configured. Add @Roles(...) explicitly.",
      });
    }

    const role = this.agencyContext.role as UserRole | null;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: "Your role does not have access to this action.",
      });
    }

    return true;
  }
}
