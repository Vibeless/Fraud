import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import {
  ApiKeyCreatedResponse,
  ApiKeyListResponse,
} from "./dto/api-key-response.dto";
import { JwtGuard } from "../../common/guards/jwt.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentAgency } from "../../common/decorators/current-agency.decorator";
import { AgencyContext } from "../../common/context/agency-context";
import { AuditAction } from "../../common/interceptors/audit.interceptor";
import { UserRole } from "../../database/entities";
import { ErrorCode } from "../../common/filters/api-error";

/**
 * OAS §9 & AAD §3, §5.2: API Key Management.
 * Dashboard JWT only (agency_admin / platform_admin).
 */
@Controller("v1/api-keys")
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.AGENCY_ADMIN)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @AuditAction("api_key.created")
  create(
    @Body() dto: CreateApiKeyDto,
    @CurrentAgency() ctx: AgencyContext,
  ): Promise<ApiKeyCreatedResponse> {
    let targetAgencyId: string;

    if (ctx.role === UserRole.PLATFORM_ADMIN || !ctx.agencyIdOrNull) {
      if (!dto.agencyId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: "agencyId is required in request body for platform_admin.",
        });
      }
      targetAgencyId = dto.agencyId;
    } else {
      targetAgencyId = ctx.agencyId;
      if (dto.agencyId && dto.agencyId !== ctx.agencyId) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: "Cannot create API key for a different agency.",
        });
      }
    }

    return this.apiKeysService.create(targetAgencyId, dto);
  }

  @Get()
  list(@CurrentAgency() ctx: AgencyContext): Promise<ApiKeyListResponse> {
    return this.apiKeysService.list(ctx.agencyIdOrNull);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditAction("api_key.revoked")
  async revoke(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ): Promise<void> {
    await this.apiKeysService.revoke(ctx.agencyIdOrNull, id);
  }
}
