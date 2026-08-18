import { Repository } from "typeorm";
import { AuditService } from "../../../../src/modules/audit/audit.service";
import { ApiKey, AuditActorType, AuditLog, User } from "../../../../src/database/entities";

describe("AuditService (Unit)", () => {
  let service: AuditService;
  let auditLogRepo: jest.Mocked<Repository<AuditLog>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let apiKeyRepo: jest.Mocked<Repository<ApiKey>>;

  const agencyId = "11111111-1111-1111-1111-111111111111";
  const actorId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    auditLogRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    } as unknown as jest.Mocked<Repository<AuditLog>>;

    userRepo = {
      find: jest.fn().mockResolvedValue([{ id: actorId, email: "user@agency.com" }]),
    } as unknown as jest.Mocked<Repository<User>>;

    apiKeyRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<ApiKey>>;

    service = new AuditService(auditLogRepo, userRepo, apiKeyRepo);
  });

  describe("list", () => {
    it("should list audit logs scoped to agencyId with default pagination", async () => {
      const mockDate = new Date();
      const mockLog: Partial<AuditLog> = {
        id: "log-1",
        agencyId,
        actorType: AuditActorType.USER,
        actorId,
        action: "campaign.created",
        resourceType: "campaign",
        resourceId: "camp-1",
        ipAddress: "127.0.0.1",
        createdAt: mockDate,
      };

      auditLogRepo.findAndCount.mockResolvedValue([
        [mockLog as AuditLog],
        1,
      ]);

      const result = await service.list(agencyId, { page: 1, pageSize: 25 });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { agencyId },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 25,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: "log-1",
        action: "campaign.created",
        actorType: AuditActorType.USER,
        actorId,
        actorLabel: "user@agency.com",
        resourceType: "campaign",
        resourceId: "camp-1",
        ipAddress: "127.0.0.1",
        createdAt: mockDate,
      });
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        pageSize: 25,
      });
    });

    it("should filter by action when action is provided", async () => {
      await service.list(agencyId, {
        page: 1,
        pageSize: 10,
        action: "api_key.revoked",
      });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agencyId, action: "api_key.revoked" },
          skip: 0,
          take: 10,
        }),
      );
    });

    it("should filter by actorId when actorId is provided", async () => {
      await service.list(agencyId, {
        page: 2,
        pageSize: 10,
        actorId,
      });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agencyId, actorId },
          skip: 10,
          take: 10,
        }),
      );
    });

    it("should filter by dateFrom and dateTo range when both provided", async () => {
      const dateFrom = "2026-08-01T00:00:00.000Z";
      const dateTo = "2026-08-15T23:59:59.999Z";

      await service.list(agencyId, {
        page: 1,
        pageSize: 25,
        dateFrom,
        dateTo,
      });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agencyId,
            createdAt: expect.anything(),
          }),
        }),
      );
    });

    it("should filter by dateFrom alone", async () => {
      const dateFrom = "2026-08-01T00:00:00.000Z";

      await service.list(agencyId, {
        page: 1,
        pageSize: 25,
        dateFrom,
      });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agencyId,
            createdAt: expect.anything(),
          }),
        }),
      );
    });

    it("should filter by dateTo alone", async () => {
      const dateTo = "2026-08-15T23:59:59.999Z";

      await service.list(agencyId, {
        page: 1,
        pageSize: 25,
        dateTo,
      });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agencyId,
            createdAt: expect.anything(),
          }),
        }),
      );
    });

    it("should combine multiple filters (action, actorId, date range, pagination math)", async () => {
      const dateFrom = "2026-08-01T00:00:00.000Z";
      const dateTo = "2026-08-15T23:59:59.999Z";

      await service.list(agencyId, {
        page: 3,
        pageSize: 15,
        action: "submission.reviewed",
        actorId,
        dateFrom,
        dateTo,
      });

      expect(auditLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agencyId,
            action: "submission.reviewed",
            actorId,
            createdAt: expect.anything(),
          }),
          skip: 30, // (3 - 1) * 15 = 30
          take: 15,
        }),
      );
    });
  });
});
