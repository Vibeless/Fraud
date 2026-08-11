import { Test, TestingModule } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { DataSource } from "typeorm";
import { getQueueToken } from "@nestjs/bullmq";
import { HealthService } from "../../../../src/modules/health/health.service";
import { HealthController } from "../../../../src/modules/health/health.controller";
import { ANALYSIS_QUEUE } from "../../../../src/queue/queue.constants";

describe("HealthModule (Unit)", () => {
  let service: HealthService;
  let controller: HealthController;

  let mockDataSource: { query: jest.Mock };
  let mockRedisClient: { ping: jest.Mock };
  let mockQueue: {
    client: Promise<any>;
    waitUntilReady: jest.Mock;
    getJobCounts: jest.Mock;
  };
  let mockResponse: { status: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    mockRedisClient = {
      ping: jest.fn(),
    };

    mockQueue = {
      client: Promise.resolve(mockRedisClient),
      waitUntilReady: jest.fn(),
      getJobCounts: jest.fn(),
    };

    mockResponse = {
      status: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getQueueToken(ANALYSIS_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    controller = module.get<HealthController>(HealthController);
  });

  describe("HealthService", () => {
    it("should return status ok when all dependencies are healthy", async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);
      mockRedisClient.ping.mockResolvedValue("PONG");
      mockQueue.waitUntilReady.mockResolvedValue(undefined);
      mockQueue.getJobCounts.mockResolvedValue({ active: 0, waiting: 0 });

      const res = await service.checkHealth();

      expect(res.status).toBe("ok");
      expect(res.dependencies).toEqual({
        database: "ok",
        redis: "ok",
        queue: "ok",
      });
      expect(res.version).toBeDefined();
    });

    it("should return status error when database is down", async () => {
      mockDataSource.query.mockRejectedValue(new Error("DB Connection Error"));
      mockRedisClient.ping.mockResolvedValue("PONG");
      mockQueue.waitUntilReady.mockResolvedValue(undefined);
      mockQueue.getJobCounts.mockResolvedValue({ active: 0, waiting: 0 });

      const res = await service.checkHealth();

      expect(res.status).toBe("error");
      expect(res.dependencies).toEqual({
        database: "error",
        redis: "ok",
        queue: "ok",
      });
    });

    it("should return status error when redis is down", async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);
      mockRedisClient.ping.mockRejectedValue(
        new Error("Redis Connection Refused"),
      );
      mockQueue.waitUntilReady.mockResolvedValue(undefined);
      mockQueue.getJobCounts.mockResolvedValue({ active: 0, waiting: 0 });

      const res = await service.checkHealth();

      expect(res.status).toBe("error");
      expect(res.dependencies).toEqual({
        database: "ok",
        redis: "error",
        queue: "ok",
      });
    });

    it("should return status error when queue is down", async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);
      mockRedisClient.ping.mockResolvedValue("PONG");
      mockQueue.waitUntilReady.mockRejectedValue(new Error("Queue not ready"));

      const res = await service.checkHealth();

      expect(res.status).toBe("error");
      expect(res.dependencies).toEqual({
        database: "ok",
        redis: "ok",
        queue: "error",
      });
    });

    it("should handle check timeout as error without hanging", async () => {
      // Database check hangs indefinitely
      mockDataSource.query.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );
      mockRedisClient.ping.mockResolvedValue("PONG");
      mockQueue.waitUntilReady.mockResolvedValue(undefined);
      mockQueue.getJobCounts.mockResolvedValue({ active: 0, waiting: 0 });

      // Override timeout for fast unit test execution
      const checkPromise = service["withTimeout"](
        async () => {
          await mockDataSource.query();
          return "ok";
        },
        50, // 50ms short timeout for testing
      );

      const dbStatus = await checkPromise;
      expect(dbStatus).toBe("error");
    }, 5000);
  });

  describe("HealthController", () => {
    it("should return 200 OK when all dependencies pass", async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);
      mockRedisClient.ping.mockResolvedValue("PONG");
      mockQueue.waitUntilReady.mockResolvedValue(undefined);
      mockQueue.getJobCounts.mockResolvedValue({ active: 0, waiting: 0 });

      const res = await controller.check(mockResponse as any);

      expect(res.status).toBe("ok");
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it("should return 503 Service Unavailable when any dependency fails", async () => {
      mockDataSource.query.mockRejectedValue(new Error("DB Down"));
      mockRedisClient.ping.mockResolvedValue("PONG");
      mockQueue.waitUntilReady.mockResolvedValue(undefined);
      mockQueue.getJobCounts.mockResolvedValue({ active: 0, waiting: 0 });

      const res = await controller.check(mockResponse as any);

      expect(res.status).toBe("error");
      expect(res.dependencies.database).toBe("error");
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    });
  });
});
