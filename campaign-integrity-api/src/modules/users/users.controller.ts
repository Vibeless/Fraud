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
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { InviteUserDto } from "./dto/invite-user.dto";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import {
  UserInvitedResponseDto,
  UserListResponseDto,
  UserResponseDto,
} from "./dto/user-response.dto";
import { JwtGuard } from "../../common/guards/jwt.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentAgency } from "../../common/decorators/current-agency.decorator";
import { AgencyContext } from "../../common/context/agency-context";
import { AuditAction } from "../../common/interceptors/audit.interceptor";
import { UserRole } from "../../database/entities";
import { ErrorCode } from "../../common/filters/api-error";

/**
 * Controller for dashboard user management (AAD §5.1/§5.2, DUXS §4.7).
 * Dashboard JWT only (agency_admin, platform_admin).
 */
@Controller("v1/users")
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.AGENCY_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @AuditAction("user.invited")
  invite(
    @Body() dto: InviteUserDto,
    @CurrentAgency() ctx: AgencyContext,
  ): Promise<UserInvitedResponseDto> {
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
          message: "Cannot invite user for a different agency.",
        });
      }
    }

    return this.usersService.invite(targetAgencyId, dto);
  }

  @Get()
  list(@CurrentAgency() ctx: AgencyContext): Promise<UserListResponseDto> {
    return this.usersService.list(ctx.agencyIdOrNull);
  }

  @Patch(":id/role")
  @AuditAction("user.role_changed")
  changeRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentAgency() ctx: AgencyContext,
  ): Promise<UserResponseDto> {
    return this.usersService.changeRole(ctx.agencyIdOrNull, id, dto);
  }

  @Patch(":id/disable")
  @AuditAction("user.disabled")
  disable(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ): Promise<UserResponseDto> {
    return this.usersService.disable(ctx.agencyIdOrNull, id, ctx.userId);
  }
}
