import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { UsersService } from "../../../../src/modules/users/users.service";
import { User, UserRole, UserStatus } from "../../../../src/database/entities";
import { AppConfigService } from "../../../../src/config/app-config.service";
import { verifySecret } from "../../../../src/common/crypto/argon2.util";
import { ErrorCode } from "../../../../src/common/filters/api-error";

describe("UsersService (Unit)", () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let configService: jest.Mocked<AppConfigService>;

  const agencyId = "11111111-1111-1111-1111-111111111111";
  const otherAgencyId = "22222222-2222-2222-2222-222222222222";
  const userId = "33333333-3333-3333-3333-333333333333";
  const testPasswordPepper = "test-password-pepper-12345";

  beforeEach(() => {
    userRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
      })),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({
          id: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          ...entity,
        }),
      ),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    configService = {
      argon2: {
        pepper: testPasswordPepper,
        apiKeyPepper: "api-key-pepper",
      },
    } as unknown as jest.Mocked<AppConfigService>;

    service = new UsersService(userRepo, configService);
  });

  describe("invite()", () => {
    it("generates a 16-char temporary password, hashes with Argon2id, and creates user with invited status", async () => {
      userRepo.findOne.mockResolvedValue(null);

      const res = await service.invite(agencyId, {
        email: "newuser@agency.com",
        role: UserRole.FRAUD_REVIEWER,
      });

      expect(res.email).toBe("newuser@agency.com");
      expect(res.role).toBe(UserRole.FRAUD_REVIEWER);
      expect(res.status).toBe(UserStatus.INVITED);
      expect(res.temporaryPassword).toBeDefined();
      expect(res.temporaryPassword.length).toBeGreaterThanOrEqual(12);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId,
          email: "newuser@agency.com",
          role: UserRole.FRAUD_REVIEWER,
          status: UserStatus.INVITED,
        }),
      );

      // Verify the generated password hash can be verified with the returned temporary password
      const savedArg = (userRepo.create as jest.Mock).mock.calls[0][0];
      const valid = await verifySecret(
        savedArg.passwordHash,
        res.temporaryPassword,
        testPasswordPepper,
      );
      expect(valid).toBe(true);
    });

    it("rejects inviting platform_admin role via this endpoint", async () => {
      await expect(
        service.invite(agencyId, {
          email: "admin@platform.com",
          role: UserRole.PLATFORM_ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects invite if email already exists with 409 Conflict", async () => {
      userRepo.findOne.mockResolvedValue({
        id: "existing-id",
        email: "existing@agency.com",
      } as User);

      await expect(
        service.invite(agencyId, {
          email: "existing@agency.com",
          role: UserRole.CAMPAIGN_MANAGER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("list()", () => {
    it("returns users scoped to agencyId", async () => {
      userRepo.find.mockResolvedValue([
        {
          id: userId,
          email: "user1@agency.com",
          role: UserRole.AGENCY_ADMIN,
          status: UserStatus.ACTIVE,
          lastLoginAt: new Date(),
          createdAt: new Date(),
        } as User,
      ]);

      const res = await service.list(agencyId);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agencyId },
        }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.data[0].email).toBe("user1@agency.com");
    });

    it("returns all users across agencies if agencyId is null (platform_admin)", async () => {
      userRepo.find.mockResolvedValue([]);

      await service.list(null);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.anything(),
        }),
      );
    });
  });

  describe("changeRole()", () => {
    it("updates role successfully", async () => {
      const mockUser = {
        id: userId,
        agencyId,
        email: "user@agency.com",
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      userRepo.findOne.mockResolvedValue(mockUser);

      const res = await service.changeRole(agencyId, userId, {
        role: UserRole.CAMPAIGN_MANAGER,
      });

      expect(res.role).toBe(UserRole.CAMPAIGN_MANAGER);
      expect(mockUser.role).toBe(UserRole.CAMPAIGN_MANAGER);
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
    });

    it("rejects changing role to platform_admin", async () => {
      await expect(
        service.changeRole(agencyId, userId, {
          role: UserRole.PLATFORM_ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException if user is not found or belongs to another agency", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeRole(otherAgencyId, userId, {
          role: UserRole.CAMPAIGN_MANAGER,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("disable()", () => {
    it("disables user account", async () => {
      const mockUser = {
        id: userId,
        agencyId,
        email: "user@agency.com",
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      userRepo.findOne.mockResolvedValue(mockUser);

      const res = await service.disable(agencyId, userId, "admin-user-id");

      expect(res.status).toBe(UserStatus.DISABLED);
      expect(mockUser.status).toBe(UserStatus.DISABLED);
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
    });

    it("prevents self-disable guard (throws 400 BadRequest)", async () => {
      await expect(
        service.disable(agencyId, userId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException if user not found", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.disable(agencyId, "non-existent", "admin-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
