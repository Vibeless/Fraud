import { SetMetadata } from "@nestjs/common";

export const SCOPES_KEY = "scopes";

/**
 * Marks a route as requiring one or more API key scopes, per
 * docs/specs/04_Authentication_Authorization_Design_AAD.md §3.2. Enforced
 * by ApiKeyGuard. A caller needs at least one of the listed scopes.
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(SCOPES_KEY, scopes);
