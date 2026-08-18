import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Repository } from "typeorm";
import { ApiKeyGuard } from "../../../../src/common/guards/api-key.guard";
import { ApiKey } from "../../../../src/database/entities";
import { AgencyContext } from "../../../../src/common/context/agency-context";
import { AppConfigService } from "../../../../src/config/app-config.service";
import {
  hashSecret,
} from "../../../../src/common/crypto/argon2.util";
import { ErrorCode } from "../../../../src/common/filters/api-error";

describe("ApiKeyGuard (Unit)", () => {
  let guard: ApiKeyGuard;
  let apiKeyRepo: jest.Mocked<Repository<ApiKey>>;
  let agencyContext: AgencyContext;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<AppConfigService>;

  const agencyId = "11111111-1111-1111-1111-111111111111";
  const apiKeyId = "33333333-3333-3333-3333-333333333333";
  const pepper = "test-api-key-pepper-abcdef123456";
  const rawKey = "ci_live_validSecretKeyWithEnoughEntropy1234567890";
  const keyPrefix = rawKey.slice(0, 12);
  let validKeyHash: string;

  beforeAll(async () => {
    validKeyHash = await hashSecret(rawKey, pepper);
  });

  beforeEach(() => {
    apiKeyRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<ApiKey>>;

    agencyContext = new AgencyContext();

    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      argon2: {
        apiKeyPepper: pepper,
      },
    } as unknown as jest.Mocked<AppConfigService>;

    guard = new ApiKeyGuard(
      apiKeyRepo,
      agencyContext,
      reflector,
      configService,
    );
  });

  function createMockExecutionContext(authHeader?: string): ExecutionContext {
    const request = {
      headers: {
        authorization: authHeader,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it("should allow public routes without checking header", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockExecutionContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(apiKeyRepo.findOne).not.toHaveBeenCalled();
  });

  it("should throw UnauthorizedException if authorization header is missing", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("should throw UnauthorizedException if authorization token does not start with ci_", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext("Bearer jwt.token.here");

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("should throw UnauthorizedException if keyPrefix not found in database", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext(`Bearer ${rawKey}`);
    apiKeyRepo.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(apiKeyRepo.findOne).toHaveBeenCalledWith({
      where: { keyPrefix },
      select: ["id", "agencyId", "keyHash", "scopes", "revokedAt"],
    });
  });

  it("should throw UnauthorizedException immediately if key is revoked", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext(`Bearer ${rawKey}`);
    apiKeyRepo.findOne.mockResolvedValue({
      id: apiKeyId,
      agencyId,
      keyHash: validKeyHash,
      scopes: ["submissions:write"],
      revokedAt: new Date(),
    } as ApiKey);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("should throw UnauthorizedException if key secret fails hash verification", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext(
      "Bearer ci_live_wrongSecretKey12345678901234567890",
    );
    apiKeyRepo.findOne.mockResolvedValue({
      id: apiKeyId,
      agencyId,
      keyHash: validKeyHash,
      scopes: ["submissions:write"],
      revokedAt: null,
    } as ApiKey);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("should throw ForbiddenException if key is missing a required scope", async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === "isPublic") return false;
      if (key === "scopes") return ["submissions:write"];
      return undefined;
    });

    const context = createMockExecutionContext(`Bearer ${rawKey}`);
    apiKeyRepo.findOne.mockResolvedValue({
      id: apiKeyId,
      agencyId,
      keyHash: validKeyHash,
      scopes: ["submissions:read"],
      revokedAt: null,
    } as ApiKey);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getResponse()).toEqual(
        expect.objectContaining({
          code: ErrorCode.FORBIDDEN,
        }),
      );
    }
  });

  it("should authenticate valid key, populate AgencyContext, and update lastUsedAt", async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === "isPublic") return false;
      if (key === "scopes") return ["submissions:write"];
      return undefined;
    });

    const context = createMockExecutionContext(`Bearer ${rawKey}`);
    apiKeyRepo.findOne.mockResolvedValue({
      id: apiKeyId,
      agencyId,
      keyHash: validKeyHash,
      scopes: ["submissions:write", "analyses:read"],
      revokedAt: null,
    } as ApiKey);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(agencyContext.agencyId).toBe(agencyId);
    expect(agencyContext.authType).toBe("api_key");
    expect(agencyContext.scopes).toEqual(["submissions:write", "analyses:read"]);
    expect(apiKeyRepo.update).toHaveBeenCalledWith(apiKeyId, {
      lastUsedAt: expect.any(Date),
    });
  });
});
