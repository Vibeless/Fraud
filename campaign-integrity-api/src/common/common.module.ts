import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { ApiKey, AuditLog } from '../database/entities';
import { AgencyContext } from './context/agency-context';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthGuard } from './guards/auth.guard';
import { ScopesOrRolesGuard } from './guards/scopes-or-roles.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';

const CommonTypeOrmFeature = TypeOrmModule.forFeature([ApiKey, AuditLog]);

/**
 * Cross-cutting providers every feature module needs: auth guards, the
 * request-scoped AgencyContext, and the logging/audit interceptors.
 *
 * IMPORTANT: TypeOrmModule.forFeature(...) is imported AND re-exported
 * here (not just imported) — ApiKeyGuard and AuditInterceptor both need
 * @InjectRepository(ApiKey)/@InjectRepository(AuditLog), and @Global()
 * only makes a module's own `exports` global, not its `imports`. Forgetting
 * this re-export is an easy way to get "Nest can't resolve dependencies"
 * errors that only surface once no other module happens to provide the
 * same repository locally — this bit us once already in this repo's
 * history when the api-keys feature module (which incidentally provided
 * ApiKeyRepository) was removed. Verified by actually booting the app,
 * not just by tsc/build succeeding — TypeORM repository wiring is a
 * runtime DI concern tsc cannot catch.
 *
 * LoggingInterceptor and AuditInterceptor ARE registered globally (via
 * APP_INTERCEPTOR) — unlike the guards, these are safe to apply to every
 * request by default: LoggingInterceptor always logs, and AuditInterceptor
 * is a no-op unless a route carries @AuditAction(...), so registering it
 * globally is what makes that decorator actually take effect anywhere in
 * the app without every module remembering to also add @UseInterceptors().
 *
 * Deliberately NOT registering a global default guard (no APP_GUARD for
 * auth here). Every controller must declare its own @UseGuards(...)
 * explicitly — see .agents/rules/20-security.md. This is slightly more
 * typing per controller in exchange for "what auth does this route
 * require" always being answerable by reading that one file, not by also
 * checking for hidden global wiring.
 */
@Global()
@Module({
  imports: [
    AppConfigModule,
    CommonTypeOrmFeature,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSigningKey,
        signOptions: { expiresIn: config.jwtAccessTokenTtlSeconds },
      }),
    }),
  ],
  providers: [
    AgencyContext,
    ApiKeyGuard,
    JwtGuard,
    RolesGuard,
    AuthGuard,
    ScopesOrRolesGuard,
    LoggingInterceptor,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [
    CommonTypeOrmFeature,
    AgencyContext,
    ApiKeyGuard,
    JwtGuard,
    RolesGuard,
    AuthGuard,
    ScopesOrRolesGuard,
    LoggingInterceptor,
    AuditInterceptor,
    JwtModule,
  ],
})
export class CommonModule {}
