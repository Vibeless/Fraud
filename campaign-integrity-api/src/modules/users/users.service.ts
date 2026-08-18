import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { User, UserRole, UserStatus } from "../../database/entities";
import { AppConfigService } from "../../config/app-config.service";
import { hashSecret } from "../../common/crypto/argon2.util";
import { InviteUserDto } from "./dto/invite-user.dto";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import {
  UserInvitedResponseDto,
  UserListResponseDto,
  UserResponseDto,
} from "./dto/user-response.dto";
import { ErrorCode } from "../../common/filters/api-error";

/**
 * Service managing dashboard user lifecycle, role management, and status (AAD §5, DUXS §4.7).
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Invites a new user to the agency with status 'invited' and a secure temporary password.
   */
  async invite(
    agencyId: string,
    dto: InviteUserDto,
  ): Promise<UserInvitedResponseDto> {
    if (dto.role === UserRole.PLATFORM_ADMIN) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "platform_admin role cannot be invited via this endpoint.",
      });
    }

    const existing = await this.users.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: "User with this email already exists.",
      });
    }

    // Generate a secure 16-character temporary password (shown once on invite)
    const temporaryPassword = randomBytes(12).toString("base64url");
    const passwordHash = await hashSecret(
      temporaryPassword,
      this.config.argon2.pepper,
    );

    const user = this.users.create({
      agencyId,
      email: dto.email,
      role: dto.role,
      status: UserStatus.INVITED,
      passwordHash,
    });

    const saved = await this.users.save(user);

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      status: saved.status,
      temporaryPassword,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Lists users for the agency (or all users for platform_admin when agencyId is null).
   */
  async list(agencyId: string | null): Promise<UserListResponseDto> {
    const userList = await this.users.find({
      ...(agencyId !== null ? { where: { agencyId } } : {}),
      select: ["id", "email", "role", "status", "lastLoginAt", "createdAt"],
      order: { createdAt: "DESC" },
    });

    return {
      data: userList.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    };
  }

  /**
   * Updates a user's RBAC role.
   */
  async changeRole(
    agencyId: string | null,
    id: string,
    dto: ChangeUserRoleDto,
  ): Promise<UserResponseDto> {
    if (dto.role === UserRole.PLATFORM_ADMIN) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot assign platform_admin role via this endpoint.",
      });
    }

    const user = await this.users.findOne({
      where: agencyId !== null ? { id, agencyId } : { id },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "User not found.",
      });
    }

    user.role = dto.role;
    const saved = await this.users.save(user);

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      status: saved.status,
      lastLoginAt: saved.lastLoginAt,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * Disables a user account.
   * Prevents self-disable by the acting admin.
   */
  async disable(
    agencyId: string | null,
    id: string,
    callerUserId: string | null,
  ): Promise<UserResponseDto> {
    if (callerUserId && callerUserId === id) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot disable your own user account.",
      });
    }

    const user = await this.users.findOne({
      where: agencyId !== null ? { id, agencyId } : { id },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "User not found.",
      });
    }

    user.status = UserStatus.DISABLED;
    const saved = await this.users.save(user);

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      status: saved.status,
      lastLoginAt: saved.lastLoginAt,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
