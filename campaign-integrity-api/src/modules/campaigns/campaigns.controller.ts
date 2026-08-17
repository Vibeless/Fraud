import {
  Body,
  Controller,
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
    return this.campaignsService.create(ctx.agencyId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  list(
    @Query() query: ListCampaignsQueryDto,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.list(ctx.agencyId, query);
  }

  @Get(":id")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("campaigns:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.campaignsService.findById(ctx.agencyId, id);
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
    return this.campaignsService.activate(ctx.agencyId, id);
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
    return this.campaignsService.close(ctx.agencyId, id);
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
    return this.campaignsService.reopen(ctx.agencyId, id);
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
    return this.campaignsService.analyze(ctx.agencyId, id);
  }
}
