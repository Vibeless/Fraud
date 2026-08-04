import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../../database/entities";

export const ROLES_KEY = "roles";

/**
 * Marks a route as restricted to specific dashboard roles, per the
 * permission matrix in docs/specs/04_Authentication_Authorization_Design_AAD.md §5.2.
 * Enforced by RolesGuard. Has no effect on API-key-authenticated routes —
 * those are gated by scopes instead, via @RequireScopes().
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
