import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { UserRole } from "../../../database/entities";

/**
 * Request body for POST /v1/users (Invite a user).
 * AAD §5.1, §5.2; DUXS §4.7.
 */
export class InviteUserDto {
  @IsNotEmpty({ message: "Email is required." })
  @IsEmail({}, { message: "Must be a valid email address." })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsNotEmpty({ message: "Role is required." })
  @IsEnum(UserRole, {
    message:
      "Role must be one of: agency_admin, campaign_manager, fraud_reviewer, viewer.",
  })
  role!: UserRole;

  @IsOptional()
  @IsUUID("4", { message: "agencyId must be a valid UUID." })
  agencyId?: string;
}
