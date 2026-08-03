import { Injectable, Scope } from '@nestjs/common';

/**
 * Request-scoped holder for the caller's resolved agencyId (and, for
 * dashboard callers, userId/role). Set exactly once by ApiKeyGuard or
 * JwtGuard after successful authentication, then read by every service
 * that needs to scope a query.
 *
 * This exists so "every query is agency-scoped" (AGENTS.md non-negotiable
 * #3) is enforced by construction rather than by remembering to add a
 * `where agencyId = ...` clause in every repository method by hand.
 * Services should depend on this instead of pulling agencyId off the
 * request object directly.
 */
@Injectable({ scope: Scope.REQUEST })
export class AgencyContext {
  private _agencyId: string | null = null;
  private _userId: string | null = null;
  private _role: string | null = null;
  private _authType: 'api_key' | 'jwt' | null = null;
  private _scopes: string[] = [];

  set(params: {
    agencyId: string | null;
    userId?: string | null;
    role?: string | null;
    scopes?: string[];
    authType: 'api_key' | 'jwt';
  }) {
    this._agencyId = params.agencyId;
    this._userId = params.userId ?? null;
    this._role = params.role ?? null;
    this._scopes = params.scopes ?? [];
    this._authType = params.authType;
  }

  /**
   * Throws rather than returning null/undefined, so a service can never
   * accidentally run an unscoped query because agencyId happened to be
   * falsy. platform_admin cross-agency endpoints must not use this getter
   * — they should handle the platform_admin case explicitly.
   */
  get agencyId(): string {
    if (!this._agencyId) {
      throw new Error(
        'AgencyContext.agencyId accessed with no agency resolved on the request. ' +
          'This is a bug: every guarded route must resolve an agencyId before reaching a service.',
      );
    }
    return this._agencyId;
  }

  /** Use only where a null agency is genuinely valid (e.g. platform_admin). */
  get agencyIdOrNull(): string | null {
    return this._agencyId;
  }

  get userId(): string | null {
    return this._userId;
  }

  get role(): string | null {
    return this._role;
  }

  get authType(): 'api_key' | 'jwt' | null {
    return this._authType;
  }

  get scopes(): string[] {
    return this._scopes;
  }
}
