import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AppConfigService } from "../../../src/config/app-config.service";

describe("AppConfigService", () => {
  let service: AppConfigService;
  let mockConfigService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };
  });

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  };

  describe("database", () => {
    it("should return url config when DATABASE_URL is set", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "DATABASE_URL") return "postgresql://localhost/prod_db";
        return undefined;
      });
      await createService();

      expect(service.database).toEqual({
        url: "postgresql://localhost/prod_db",
      });
      expect(mockConfigService.get).toHaveBeenCalledWith("DATABASE_URL");
    });

    it("should return discrete config when DATABASE_URL is not set", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "DATABASE_URL") return undefined;
        if (key === "DB_PASSWORD") return "secret";
        return undefined;
      });
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, any> = {
          DB_HOST: "localhost",
          DB_PORT: 5432,
          DB_USERNAME: "postgres",
          DB_NAME: "campaign_integrity",
        };
        return values[key];
      });
      await createService();

      expect(service.database).toEqual({
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "secret",
        database: "campaign_integrity",
      });
    });
  });

  describe("redis", () => {
    it("should return url config when REDIS_URL is set", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "REDIS_URL") return "redis://localhost:6379";
        return undefined;
      });
      await createService();

      expect(service.redis).toEqual({
        url: "redis://localhost:6379",
      });
    });

    it("should return discrete config when REDIS_URL is not set", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "REDIS_URL") return undefined;
        if (key === "REDIS_PASSWORD") return "redis-pass";
        return undefined;
      });
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, any> = {
          REDIS_HOST: "localhost",
          REDIS_PORT: 6379,
        };
        return values[key];
      });
      await createService();

      expect(service.redis).toEqual({
        host: "localhost",
        port: 6379,
        password: "redis-pass",
      });
    });
  });

  describe("jwt", () => {
    it("should return jwt config with access and refresh tokens TTL/secrets", async () => {
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, any> = {
          JWT_SIGNING_KEY: "signing-key-value",
          JWT_ACCESS_TOKEN_TTL_SECONDS: 900,
          JWT_REFRESH_TOKEN_TTL_SECONDS: 2592000,
        };
        return values[key];
      });
      await createService();

      expect(service.jwt).toEqual({
        accessSecret: "signing-key-value",
        accessTtl: 900,
        refreshSecret: "signing-key-value",
        refreshTtl: 2592000,
      });
    });
  });

  describe("argon2", () => {
    it("should return argon2 pepper and apiKeyPepper config", async () => {
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === "ARGON2_PEPPER") return "pepper-value";
        if (key === "API_KEY_HASH_PEPPER") return "api-key-pepper-value";
        return undefined;
      });
      await createService();

      expect(service.argon2).toEqual({
        pepper: "pepper-value",
        apiKeyPepper: "api-key-pepper-value",
      });
    });
  });

  describe("apiKey", () => {
    it("should return apiKey config with prefix and hashPepper", async () => {
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === "API_KEY_PREFIX") return "ci_live_";
        if (key === "API_KEY_HASH_PEPPER") return "api-key-pepper-value";
        return undefined;
      });
      await createService();

      expect(service.apiKey).toEqual({
        prefix: "ci_live_",
        hashPepper: "api-key-pepper-value",
      });
    });
  });

  describe("app", () => {
    it("should return app config including parsed corsOrigins and rate limits", async () => {
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, any> = {
          PORT: 3000,
          NODE_ENV: "development",
          CORS_ORIGIN: "http://localhost:3000, http://localhost:3001",
          RATE_LIMIT_READ_PER_MINUTE: 120,
          RATE_LIMIT_SUBMIT_PER_MINUTE: 30,
        };
        return values[key];
      });
      await createService();

      expect(service.app).toEqual({
        port: 3000,
        env: "development",
        corsOrigins: ["http://localhost:3000", "http://localhost:3001"],
        rateLimitReadPerMinute: 120,
        rateLimitSubmitPerMinute: 30,
      });
    });
  });

  describe("xApi", () => {
    it("should return xApi config with token and base url", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "X_API_BEARER_TOKEN") return "bearer-token-value";
        if (key === "X_API_BASE_URL") return "https://api.x.com";
        return undefined;
      });
      await createService();

      expect(service.xApi).toEqual({
        bearerToken: "bearer-token-value",
        baseUrl: "https://api.x.com",
      });
    });

    it("should return default base url when X_API_BASE_URL is not set", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "X_API_BEARER_TOKEN") return undefined;
        if (key === "X_API_BASE_URL") return undefined;
        return undefined;
      });
      await createService();

      expect(service.xApi).toEqual({
        bearerToken: "",
        baseUrl: "https://api.twitter.com",
      });
    });
  });
});
