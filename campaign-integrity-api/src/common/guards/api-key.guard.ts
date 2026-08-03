import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as argon2 from 'argon2';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../database/entities';
import { AgencyContext } from '../context/agency-context';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ErrorCode } from '../filters/api-error';

/**
 * Validates `Authorization: Bearer <api_key>` per
 * docs/specs/04_Authentication_Authorization_Design_AAD.md §3.
 *
 * Revocation is checked on every request (not cached) so a revoked key is
 * rejected within one request, per AAD §3.4. The key's scopes are checked
 * against @RequireScopes() on the route; a route with no scopes declared
 * is a bug, not an "allow everything" default — see .agents/rules/20-security.md.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey) private readonly apiKeys: Repository<ApiKey>,
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
    const secret = extractBearerToken(header);

    if (!secret || !secret.startsWith('ci_')) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Missing or malformed API key.',
      });
    }

    const keyPrefix = secret.slice(0, 16);
    const candidate = await this.apiKeys.findOne({
      where: { keyPrefix },
      select: ['id', 'agencyId', 'keyHash', 'scopes', 'revokedAt'],
    });

    if (!candidate || candidate.revokedAt) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid or revoked API key.',
      });
    }

    const isValid = await argon2.verify(candidate.keyHash, secret);
    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid or revoked API key.',
      });
    }

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredScopes?.length) {
      const hasScope = requiredScopes.some((s) => candidate.scopes.includes(s));
      if (!hasScope) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: `This API key is missing a required scope: one of [${requiredScopes.join(', ')}].`,
        });
      }
    }

    this.agencyContext.set({
      agencyId: candidate.agencyId,
      scopes: candidate.scopes,
      authType: 'api_key',
    });
    (request as Request & { agencyContext: AgencyContext }).agencyContext = this.agencyContext;

    // Fire-and-forget last-used update; never block or fail the request on this.
    void this.apiKeys.update(candidate.id, { lastUsedAt: new Date() });

    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}
