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
import { SubmissionsService } from "./submissions.service";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { ListSubmissionsQueryDto } from "./dto/list-submissions-query.dto";
import { ReviewSubmissionDto } from "./dto/review-submission.dto";
import { AuthGuard } from "../../common/guards/auth.guard";
import { JwtGuard } from "../../common/guards/jwt.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
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

/** docs/specs/02_API_Specification_OAS.md §5-6 & DUXS §4.3 */
@Controller("v1/submissions")
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("submissions:write")
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.CAMPAIGN_MANAGER,
  )
  @AuditAction("submission.created")
  create(
    @Body() dto: CreateSubmissionDto,
    @CurrentAgency() ctx: AgencyContext,
  ) {
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
          message: "Cannot create submission for a different agency.",
        });
      }
    }

    return this.submissionsService.create(
      targetAgencyId,
      ctx.userId ?? null,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("submissions:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  list(
    @Query() query: ListSubmissionsQueryDto,
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

    return this.submissionsService.list(targetAgencyId, query);
  }

  @Get(":id")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("submissions:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.findById(ctx.agencyIdOrNull, id);
  }

  @Patch(":id/review")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.AGENCY_ADMIN,
    UserRole.FRAUD_REVIEWER,
  )
  @AuditAction("submission.reviewed")
  review(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewSubmissionDto,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.review(
      ctx.agencyIdOrNull,
      ctx.userId!,
      id,
      dto,
    );
  }

  @Get(":id/analysis")
  @UseGuards(AuthGuard, ScopesOrRolesGuard)
  @RequireScopes("analyses:read")
  @Roles(...ALL_DASHBOARD_ROLES)
  getLatestAnalysis(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.getLatestAnalysis(ctx.agencyIdOrNull, id);
  }
}
