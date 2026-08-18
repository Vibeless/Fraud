import { NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { ApiKeysService } from "../../../../src/modules/api-keys/api-keys.service";
import { ApiKey } from "../../../../src/database/entities";
import { AppConfigService } from "../../../../src/config/app-config.service";
import {
  generateApiKey,
  encodeBase62,
} from "../../../../src/common/crypto/api-key-generator.util";
import {
  hashSecret,
  verifySecret,
} from "../../../../src/common/crypto/argon2.util";
import { ErrorCode } from "../../../../src/common/filters/api-error";

describe("ApiKeysService & Crypto (Unit)", () => {
  let service: ApiKeysService;
  let apiKeyRepo: jest.Mocked<Repository<ApiKey>>;
  let configService: jest.Mocked<AppConfigService>;

  const agencyId = "11111111-1111-1111-1111-111111111111";
  const otherAgencyId = "22222222-2222-2222-2222-222222222222";
  const apiKeyId = "33333333-3333-3333-3333-333333333333";
  const testPepper = "test-api-key-pepper-abcdef123456";

  beforeEach(() => {
    apiKeyRepo = {
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({
          id: apiKeyId,
          createdAt: new Date(),
          ...entity,
        }),
      ),
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
      })),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ApiKey>>;

    configService = {
      apiKey: {
        prefix: "ci_live_",
        hashPepper: testPepper,
      },
      argon2: {
        pepper: "password-pepper",
        apiKeyPepper: testPepper,
      },
    } as unknown as jest.Mocked<AppConfigService>;

    service = new ApiKeysService(apiKeyRepo, configService);
  });

  describe("Key Generation & Cryptography", () => {
    it("should generate a key with ci_live_ prefix and 12-char keyPrefix", () => {
      const { rawKey, keyPrefix } = generateApiKey("ci_live_");

      expect(rawKey.startsWith("ci_live_")).toBe(true);
      expect(keyPrefix).toBe(rawKey.slice(0, 12));
      expect(keyPrefix.length).toBe(12);
      expect(keyPrefix.startsWith("ci_live_")).toBe(true);
      // 32 random bytes in base62 is ~43 chars, plus 8 chars prefix = ~51 chars
      expect(rawKey.length).toBeGreaterThanOrEqual(48);
    });

    it("should correctly encode bytes into base62", () => {
      const zeroBuffer = Buffer.alloc(4, 0);
      expect(encodeBase62(zeroBuffer)).toBe("0");

      const testBuffer = Buffer.from([1, 2, 3, 4]);
      const encoded = encodeBase62(testBuffer);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
      expect(/^[0-9A-Za-z]+$/.test(encoded)).toBe(true);
    });

    it("should hash and verify secret correctly with pepper", async () => {
      const rawSecret = "ci_live_sampleSecretKeyForTesting12345";
      const hash = await hashSecret(rawSecret, testPepper);

      expect(hash).toBeDefined();
      expect(hash).toContain("$argon2id$");

      const isValid = await verifySecret(hash, rawSecret, testPepper);
      expect(isValid).toBe(true);

      const isInvalidSecret = await verifySecret(
        hash,
        "ci_live_wrongSecret",
        testPepper,
      );
      expect(isInvalidSecret).toBe(false);

      const isInvalidPepper = await verifySecret(
        hash,
        rawSecret,
        "wrong-pepper",
      );
      expect(isInvalidPepper).toBe(false);
    });
  });

  describe("create", () => {
    it("should create an API key, store only hash and prefix, and return full secret once", async () => {
      const result = await service.create(agencyId, {
        name: "Production Backend",
        scopes: ["submissions:write", "analyses:read"],
      });

      expect(apiKeyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId,
          name: "Production Backend",
          scopes: ["submissions:write", "analyses:read"],
          keyPrefix: expect.stringMatching(/^ci_live_/),
          keyHash: expect.stringContaining("$argon2id$"),
        }),
      );
      expect(apiKeyRepo.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: apiKeyId,
        key: expect.stringMatching(/^ci_live_/),
        keyPrefix: expect.stringMatching(/^ci_live_/),
      });
      expect(result.keyPrefix).toBe(result.key.slice(0, 12));
    });
  });

  describe("list", () => {
    it("should list API keys scoped to agency without ever returning keyHash or raw key", async () => {
      const mockDate = new Date();
      const mockKeys = [
        {
          id: apiKeyId,
          keyPrefix: "ci_live_8f2a",
          name: "Prod backend",
          scopes: ["submissions:write", "analyses:read"],
          createdAt: mockDate,
          lastUsedAt: null,
          revokedAt: null,
        },
      ];

      apiKeyRepo.find.mockResolvedValue(mockKeys as unknown as ApiKey[]);

      const result = await service.list(agencyId);

      expect(apiKeyRepo.find).toHaveBeenCalledWith({
        where: { agencyId },
        select: [
          "id",
          "keyPrefix",
          "name",
          "scopes",
          "createdAt",
          "lastUsedAt",
          "revokedAt",
        ],
        order: { createdAt: "DESC" },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: apiKeyId,
        keyPrefix: "ci_live_8f2a",
        name: "Prod backend",
        scopes: ["submissions:write", "analyses:read"],
        createdAt: mockDate,
        lastUsedAt: null,
        revokedAt: null,
      });
      expect((result.data[0] as any).keyHash).toBeUndefined();
      expect((result.data[0] as any).key).toBeUndefined();
    });

    it("should list all API keys across all agencies when agencyId is null (platform_admin)", async () => {
      apiKeyRepo.find.mockResolvedValue([]);

      await service.list(null);

      expect(apiKeyRepo.find).toHaveBeenCalledWith({
        select: [
          "id",
          "keyPrefix",
          "name",
          "scopes",
          "createdAt",
          "lastUsedAt",
          "revokedAt",
        ],
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("revoke", () => {
    it("should mark key as revoked by setting revokedAt", async () => {
      const existingKey = {
        id: apiKeyId,
        agencyId,
        revokedAt: null,
      } as ApiKey;

      apiKeyRepo.findOne.mockResolvedValue(existingKey);

      await service.revoke(agencyId, apiKeyId);

      expect(apiKeyRepo.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId, agencyId },
      });
      expect(existingKey.revokedAt).toBeInstanceOf(Date);
      expect(apiKeyRepo.save).toHaveBeenCalledWith(existingKey);
    });

    it("should allow platform_admin (agencyId === null) to revoke key from any agency", async () => {
      const existingKey = {
        id: apiKeyId,
        agencyId: otherAgencyId,
        revokedAt: null,
      } as ApiKey;

      apiKeyRepo.findOne.mockResolvedValue(existingKey);

      await service.revoke(null, apiKeyId);

      expect(apiKeyRepo.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
      expect(existingKey.revokedAt).toBeInstanceOf(Date);
      expect(apiKeyRepo.save).toHaveBeenCalledWith(existingKey);
    });

    it("should throw NotFoundException on cross-agency access for agency_admin", async () => {
      apiKeyRepo.findOne.mockResolvedValue(null);

      await expect(service.revoke(otherAgencyId, apiKeyId)).rejects.toThrow(
        NotFoundException,
      );

      try {
        await service.revoke(otherAgencyId, apiKeyId);
      } catch (err: any) {
        expect(err.getResponse()).toEqual(
          expect.objectContaining({
            code: ErrorCode.NOT_FOUND,
          }),
        );
      }
    });

    it("should throw NotFoundException when key does not exist", async () => {
      apiKeyRepo.findOne.mockResolvedValue(null);

      await expect(service.revoke(agencyId, "non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
