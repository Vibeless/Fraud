import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { ListCampaignsQueryDto } from "./dto/list-campaigns-query.dto";
import { AuthGuard } from "../../common/guards/auth.guard";
import { ScopesOrRolesGuard } from "../../common/guards/scopes-or-roles.guard";
import { RequireScopes } from "../../common/decorators/require-scopes.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentAgency } from "../../common/decorators/current-agency.decorator";
import { AgencyContext } from "../../common/context/agency-context";
import { AuditAction } from "../../common/interceptors/audit.interceptor";
import { UserRole } from "../../database/entities";
import { ErrorCode } from "../../common/filters/api-error";

const ALL_DASHBOARD_ROLES = [
  UserRole.PLATFORM_ADMIN,
  UserRole.AGENCY_ADMIN,
  UserRole.CAMPAIGN_MANAGER,
  UserRole.FRAUD_REVIEWER,
  UserRole.VIEWER,
];

/**
 * OAS §7 & AAD §5.2: Campaigns lifecycle endpoints.
 */
@Controller("v1/campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:write")
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
  )
  @AuditAction("campaign.created")
  create(@Body() dto: CreateCampaignDto, @CurrentAgency() ctx: AgencyContext) {
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
          message: "Cannot create campaign for a different agency.",
        });
      }
    }

    return this.campaignsService.create(targetAgencyId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  list(
    @Query() query: ListCampaignsQueryDto,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    let targetAgencyId: string;

    if (ctx.role === UserRole.PLATFORM_ADMIN || !ctx.agencyIdOrNull) {
      if (!query.agencyId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: "agencyId query parameter is required for platform_admin.",
        });
      }
      targetAgencyId = query.agencyId;
    } else {
      targetAgencyId = ctx.agencyId;
    }

    return this.campaignsService.list(targetAgencyId, query);
  }

  @Get(":id")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.findById(ctx.agencyIdOrNull, id);
  }

  @Patch(":id/activate")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:write")
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
  )
  @AuditAction("campaign.activated")
  activate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.activate(ctx.agencyIdOrNull, id);
  }

  @Patch(":id/close")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:write")
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
  )
  @AuditAction("campaign.closed")
  close(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.close(ctx.agencyIdOrNull, id);
  }

  @Patch(":id/reopen")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:write")
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
  )
  @AuditAction("campaign.reopened")
  reopen(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.reopen(ctx.agencyIdOrNull, id);
  }

  @Post(":id/analyze")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:write")
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
  )
  @AuditAction("campaign.analyzed")
  analyze(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.analyze(ctx.agencyIdOrNull, id);
  }
}
