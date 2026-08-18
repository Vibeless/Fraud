import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuditService } from "./audit.service";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import { ListAuditLogsResponseDto } from "./dto/audit-log-response.dto";
import { JwtGuard } from "../../common/guards/jwt.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentAgency } from "../../common/decorators/current-agency.decorator";
import { AgencyContext } from "../../common/context/agency-context";
import { UserRole } from "../../database/entities";
import { ErrorCode } from "../../common/filters/api-error";

/**
 * OAS §10 & AAD §5.2: Audit Log query endpoint.
 * Dashboard JWT only (agency_admin, fraud_reviewer, platform_admin).
 */
@Controller("v1/audit-logs")
@UseGuards(JwtGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.AGENCY_ADMIN,
  UserRole.FRAUD_REVIEWER,
)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query() query: ListAuditLogsQueryDto,
    @CurrentAgency() ctx: AgencyContext,
  ): Promise<ListAuditLogsResponseDto> {
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

    return this.auditService.list(targetAgencyId, query);
  }
}
