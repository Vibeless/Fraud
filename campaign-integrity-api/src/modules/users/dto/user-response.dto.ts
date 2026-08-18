import { UserRole, UserStatus } from "../../../database/entities";

/**
 * Response returned once when a user is invited (AAD §3.1 / DUXS §4.7).
 * Contains the temporary password in plaintext (one-time reveal).
 */
export interface UserInvitedResponseDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  temporaryPassword: string;
  createdAt: Date;
}

/**
 * User representation for user detail/update responses.
 */
export interface UserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Single user item for list view (DUXS §4.7).
 */
export interface UserListItemDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * List response wrapper.
 */
export interface UserListResponseDto {
  data: UserListItemDto[];
}
