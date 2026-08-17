import {
  assertLocalDevEnvironment,
  seedDevData,
} from "../../../src/database/seeds/dev.seed";
import dataSource from "../../../src/database/data-source";

jest.mock("../../../src/database/data-source", () => ({
  __esModule: true,
  default: {
    isInitialized: false,
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn(),
  },
}));

describe("dev.seed.ts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("assertLocalDevEnvironment", () => {
    it("should throw if NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      process.env.DB_HOST = "localhost";
      expect(() => assertLocalDevEnvironment()).toThrow(
        /Refusing to execute dev seed script in "production"/,
      );
    });

    it("should throw if NODE_ENV is staging", () => {
      process.env.NODE_ENV = "staging";
      process.env.DB_HOST = "localhost";
      expect(() => assertLocalDevEnvironment()).toThrow(
        /Refusing to execute dev seed script in "staging"/,
      );
    });

    it("should throw if database host is remote", () => {
      process.env.NODE_ENV = "development";
      process.env.DB_HOST = "production-db.internal.company.com";
      expect(() => assertLocalDevEnvironment()).toThrow(
        /Refusing to execute dev seed script against non-local database host/,
      );
    });

    it("should allow execution if NODE_ENV is development and DB_HOST is localhost", () => {
      process.env.NODE_ENV = "development";
      process.env.DB_HOST = "localhost";
      expect(() => assertLocalDevEnvironment()).not.toThrow();
    });

    it("should allow execution if DATABASE_URL contains localhost", () => {
      process.env.NODE_ENV = "development";
      delete process.env.DB_HOST;
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";
      expect(() => assertLocalDevEnvironment()).not.toThrow();
    });
  });

  describe("seedDevData", () => {
    it("should seed one agency and five users idempotently", async () => {
      process.env.NODE_ENV = "development";
      process.env.DB_HOST = "localhost";

      const mockAgencyRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((dto) => ({ id: "agency-uuid-1", ...dto })),
        save: jest.fn().mockImplementation((agency) => Promise.resolve(agency)),
      };

      const mockUserRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((dto) => ({ id: "user-uuid-1", ...dto })),
        save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      };

      (dataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === "Agency" || entity.tableName === "agencies") {
          return mockAgencyRepo;
        }
        return mockUserRepo;
      });

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const tableSpy = jest
        .spyOn(console, "table")
        .mockImplementation(() => {});

      await seedDevData();

      expect(mockAgencyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(5);
      expect(tableSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
      tableSpy.mockRestore();
    });
  });
});
