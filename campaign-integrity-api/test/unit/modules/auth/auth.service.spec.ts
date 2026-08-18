import { UnauthorizedException } from "@nestjs/common";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import Redis from "ioredis";
import { AuthService } from "../../../../src/modules/auth/auth.service";
import {
  AuditLog,
  User,
  UserRole,
  UserStatus,
} from "../../../../src/database/entities";
import { AppConfigService } from "../../../../src/config/app-config.service";
import { hashSecret } from "../../../../src/common/crypto/argon2.util";

describe("AuthService - Status Transitions & Disabled Rejection (Unit)", () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let auditLogRepo: jest.Mocked<Repository<AuditLog>>;
  let redis: jest.Mocked<Redis>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<AppConfigService>;

  const testPepper = "test-auth-pepper-12345";
  const rawPassword = "ValidPassword123!";

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<User>>;

    auditLogRepo = {
      insert: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<Repository<AuditLog>>;

    redis = {
      set: jest.fn().mockResolvedValue("OK"),
      sadd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Redis>;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue("mock-jwt-access-token"),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      argon2: {
        pepper: testPepper,
        apiKeyPepper: "api-key-pepper",
      },
      jwt: {
        accessTtl: 900,
        refreshTtl: 604800,
      },
    } as unknown as jest.Mocked<AppConfigService>;

    service = new AuthService(
      userRepo,
      auditLogRepo,
      redis,
      jwtService,
      configService,
    );
  });

  describe("login()", () => {
    it("transitions an 'invited' user to 'active' on first successful login", async () => {
      const passwordHash = await hashSecret(rawPassword, testPepper);
      const invitedUser: Partial<User> = {
        id: "user-uuid-1",
        agencyId: "agency-uuid-1",
        email: "invited@agency.com",
        passwordHash,
        role: UserRole.CAMPAIGN_MANAGER,
        status: UserStatus.INVITED,
      };

      userRepo.findOne.mockResolvedValue(invitedUser as User);

      const result = await service.login(
        "invited@agency.com",
        rawPassword,
        "127.0.0.1",
      );

      expect(result.accessToken).toBe("mock-jwt-access-token");
      expect(result.user.email).toBe("invited@agency.com");

      // Verifies status was updated to ACTIVE
      expect(userRepo.update).toHaveBeenCalledWith(
        "user-uuid-1",
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          lastLoginAt: expect.any(Date),
        }),
      );

      // Verifies audit log login_succeeded
      expect(auditLogRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "auth.login_succeeded",
          actorId: "user-uuid-1",
        }),
      );
    });

    it("allows active users to login without changing status", async () => {
      const passwordHash = await hashSecret(rawPassword, testPepper);
      const activeUser: Partial<User> = {
        id: "user-uuid-2",
        agencyId: "agency-uuid-1",
        email: "active@agency.com",
        passwordHash,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
      };

      userRepo.findOne.mockResolvedValue(activeUser as User);

      const result = await service.login(
        "active@agency.com",
        rawPassword,
        "127.0.0.1",
      );

      expect(result.accessToken).toBe("mock-jwt-access-token");
      expect(userRepo.update).toHaveBeenCalledWith("user-uuid-2", {
        lastLoginAt: expect.any(Date),
      });
    });

    it("rejects login for 'disabled' users with UnauthorizedException", async () => {
      const passwordHash = await hashSecret(rawPassword, testPepper);
      const disabledUser: Partial<User> = {
        id: "user-uuid-3",
        agencyId: "agency-uuid-1",
        email: "disabled@agency.com",
        passwordHash,
        role: UserRole.VIEWER,
        status: UserStatus.DISABLED,
      };

      userRepo.findOne.mockResolvedValue(disabledUser as User);

      await expect(
        service.login("disabled@agency.com", rawPassword, "127.0.0.1"),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditLogRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "auth.login_failed",
        }),
      );
    });
  });

  describe("refresh()", () => {
    it("rejects token refresh if user status is disabled", async () => {
      redis.get.mockResolvedValue(JSON.stringify({ userId: "user-uuid-4" }));
      userRepo.findOne.mockResolvedValue({
        id: "user-uuid-4",
        status: UserStatus.DISABLED,
      } as User);

      await expect(service.refresh("some-refresh-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
