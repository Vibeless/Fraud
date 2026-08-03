import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { AuditActorType, AuditLog } from '../../database/entities';
import { AgencyContext } from '../context/agency-context';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * Marks a mutating route with the audit_logs `action` string to record on
 * success, e.g. @AuditAction('submission.created'). Per
 * docs/specs/05_Backend_Folder_Structure_Specification.md §3 and DDS §4 —
 * every mutating route should carry this; a mutation with no audit trail
 * is the exception that needs justifying, not the default.
 */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);

/**
 * Deliberately does NOT constructor-inject the request-scoped
 * AgencyContext. Combining a request-scoped dependency with global
 * APP_INTERCEPTOR registration (see common.module.ts) breaks Reflector
 * injection in this class — confirmed by actually booting the app, not
 * just by tsc/build succeeding. Instead this reads the AgencyContext a
 * guard already stashed on the request object (see api-key.guard.ts /
 * jwt.guard.ts), which keeps this interceptor a plain singleton.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const agencyContext = (request as Request & { agencyContext?: AgencyContext })
      .agencyContext;

    return next.handle().pipe(
      tap((result) => {
        void this.auditLogs.insert({
          agencyId: safeAgencyId(agencyContext),
          actorType:
            agencyContext?.authType === 'api_key' ? AuditActorType.API_KEY : AuditActorType.USER,
          actorId: agencyContext?.userId ?? null,
          action,
          resourceType: action.split('.')[0] ?? null,
          resourceId: extractResourceId(result),
          metadata: null,
          ipAddress: request.ip ?? null,
        });
      }),
    );
  }
}

function safeAgencyId(ctx: AgencyContext | undefined): string | null {
  if (!ctx) return null;
  try {
    return ctx.agencyId;
  } catch {
    return null;
  }
}

function extractResourceId(result: unknown): string | null {
  if (result && typeof result === 'object' && 'id' in result) {
    const id = (result as { id: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}
