import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SubmissionsService } from "./submissions.service";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { ListSubmissionsQueryDto } from "./dto/list-submissions-query.dto";
import { ApiKeyGuard } from "../../common/guards/api-key.guard";
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

/** docs/specs/02_API_Specification_OAS.md §5-6. */
@Controller("v1/submissions")
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("submissions:write")
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.AGENCY_ADMIN, UserRole.CAMPAIGN_MANAGER)
  @AuditAction("submission.created")
  create(
    @Body() dto: CreateSubmissionDto,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.create(ctx.agencyId, ctx.userId ?? null, dto);
  }

  @Get()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("submissions:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  list(
    @Query() query: ListSubmissionsQueryDto,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.list(ctx.agencyId, query);
  }

  @Get(":id")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("submissions:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.findById(ctx.agencyId, id);
  }

  @Get(":id/analysis")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("analyses:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  getLatestAnalysis(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.getLatestAnalysis(ctx.agencyId, id);
  }
}
