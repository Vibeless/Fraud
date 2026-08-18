import { IsEnum, IsNotEmpty } from "class-validator";
import { UserRole } from "../../../database/entities";

/**
 * Request body for PATCH /v1/users/:id/role (Change user role).
 * AAD §5.1, §5.2.
 */
export class ChangeUserRoleDto {
  @IsNotEmpty({ message: "Role is required." })
  @IsEnum(UserRole, {
    message:
      "Role must be one of: agency_admin, campaign_manager, fraud_reviewer, viewer.",
  })
  role!: UserRole;
}
