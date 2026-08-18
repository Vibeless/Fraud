import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { CampaignsService } from "../../../../src/modules/campaigns/campaigns.service";
import {
  Campaign,
  CampaignAnalysis,
  CampaignAnalysisStatus,
  CampaignAnalysisTrigger,
  CampaignStatus,
} from "../../../../src/database/entities";
import { Repository } from "typeorm";
import { AnalysisProducer } from "../../../../src/queue/producers/analysis.producer";

describe("CampaignsService (Unit)", () => {
  let service: CampaignsService;
  let campaignRepo: jest.Mocked<Repository<Campaign>>;
  let analysisRepo: jest.Mocked<Repository<CampaignAnalysis>>;
  let producer: jest.Mocked<AnalysisProducer>;

  const agencyId = "11111111-1111-1111-1111-111111111111";
  const campaignId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    campaignRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((dto) => ({
        id: campaignId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      manager: {
        query: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<Repository<Campaign>>;

    analysisRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((dto) => ({
        id: "analysis-uuid-1",
        createdAt: new Date(),
        ...dto,
      })),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<CampaignAnalysis>>;

    producer = {
      enqueueCampaignAnalysis: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AnalysisProducer>;

    service = new CampaignsService(campaignRepo, analysisRepo, producer);
  });

  describe("create", () => {
    it("should create campaign starting in status=draft with 0 submissions and null averageRiskScore", async () => {
      const result = await service.create(agencyId, {
        name: "Spring Launch",
        externalCampaignId: "ext-101",
      });

      expect(campaignRepo.create).toHaveBeenCalledWith({
        agencyId,
        name: "Spring Launch",
        externalCampaignId: "ext-101",
        status: CampaignStatus.DRAFT,
      });
      expect(result.status).toBe(CampaignStatus.DRAFT);
      expect(result.name).toBe("Spring Launch");
      expect(result.submissionCount).toBe(0);
      expect(result.averageRiskScore).toBeNull();
    });
  });

  describe("list", () => {
    it("should list campaigns scoped to agency with pagination and aggregates", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Spring Launch",
        externalCampaignId: null,
        status: CampaignStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      campaignRepo.findAndCount.mockResolvedValue([[mockCampaign as Campaign], 1]);
      (campaignRepo.manager.query as jest.Mock).mockResolvedValue([
        {
          campaignId,
          submissionCount: "5",
          averageRiskScore: 42.4,
        },
      ]);

      const result = await service.list(agencyId, { page: 1, pageSize: 10 });
      expect(campaignRepo.findAndCount).toHaveBeenCalledWith({
        where: { agencyId },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 10,
      });
      expect(campaignRepo.manager.query).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].submissionCount).toBe(5);
      expect(result.data[0].averageRiskScore).toBe(42);
      expect(result.pagination).toEqual({ total: 1, page: 1, pageSize: 10 });
    });

    it("should filter by status if provided in query", async () => {
      campaignRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.list(agencyId, {
        page: 1,
        pageSize: 10,
        status: CampaignStatus.ACTIVE,
      });
      expect(campaignRepo.findAndCount).toHaveBeenCalledWith({
        where: { agencyId, status: CampaignStatus.ACTIVE },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 10,
      });
    });

    it("should batch aggregates in a single query across all returned campaigns (non-N+1)", async () => {
      const mockCampaigns = [
        {
          id: "camp-1",
          agencyId,
          name: "Campaign 1",
          status: CampaignStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "camp-2",
          agencyId,
          name: "Campaign 2",
          status: CampaignStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      campaignRepo.findAndCount.mockResolvedValue([mockCampaigns as Campaign[], 2]);
      (campaignRepo.manager.query as jest.Mock).mockResolvedValue([
        { campaignId: "camp-1", submissionCount: "10", averageRiskScore: 35 },
        { campaignId: "camp-2", submissionCount: "20", averageRiskScore: 75 },
      ]);

      const result = await service.list(agencyId, { page: 1, pageSize: 25 });
      expect(campaignRepo.manager.query).toHaveBeenCalledTimes(1);
      expect(campaignRepo.manager.query).toHaveBeenCalledWith(
        expect.stringContaining("WITH campaign_submissions AS"),
        [["camp-1", "camp-2"]],
      );
      expect(result.data[0].submissionCount).toBe(10);
      expect(result.data[0].averageRiskScore).toBe(35);
      expect(result.data[1].submissionCount).toBe(20);
      expect(result.data[1].averageRiskScore).toBe(75);
    });
  });

  describe("findById & Aggregates Logic", () => {
    it("should return campaign if found for agency with aggregates", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Spring Launch",
        externalCampaignId: null,
        status: CampaignStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);
      (campaignRepo.manager.query as jest.Mock).mockResolvedValue([
        {
          campaignId,
          submissionCount: "3",
          averageRiskScore: 60,
        },
      ]);

      const result = await service.findById(agencyId, campaignId);
      expect(result.id).toBe(campaignId);
      expect(result.submissionCount).toBe(3);
      expect(result.averageRiskScore).toBe(60);
    });

    it("should return submissionCount: 0 and averageRiskScore: null for campaign with 0 submissions", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Empty Campaign",
        externalCampaignId: null,
        status: CampaignStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);
      (campaignRepo.manager.query as jest.Mock).mockResolvedValue([]); // No submissions in DB

      const result = await service.findById(agencyId, campaignId);
      expect(result.submissionCount).toBe(0);
      expect(result.averageRiskScore).toBeNull();
    });

    it("should calculate averageRiskScore: 60 and submissionCount: 3 for 2 completed (40, 80) and 1 queued submission", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Mixed Submissions Campaign",
        externalCampaignId: null,
        status: CampaignStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);
      // Query averages only completed analyses: (40 + 80)/2 = 60, total count = 3
      (campaignRepo.manager.query as jest.Mock).mockResolvedValue([
        {
          campaignId,
          submissionCount: "3",
          averageRiskScore: 60.0,
        },
      ]);

      const result = await service.findById(agencyId, campaignId);
      expect(result.submissionCount).toBe(3);
      expect(result.averageRiskScore).toBe(60);
    });

    it("should allow platform_admin (agencyId === null) to find campaign by id alone", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId: "other-agency-id",
        name: "Spring Launch",
        externalCampaignId: null,
        status: CampaignStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      const result = await service.findById(null, campaignId);
      expect(campaignRepo.findOne).toHaveBeenCalledWith({
        where: { id: campaignId },
      });
      expect(result.id).toBe(campaignId);
    });

    it("should throw NotFoundException (404) if campaign does not exist or belongs to another agency", async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(agencyId, campaignId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("activate", () => {
    it("should activate campaign from draft to active", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.DRAFT,
        name: "Draft Campaign",
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      const result = await service.activate(agencyId, campaignId);
      expect(result.status).toBe(CampaignStatus.ACTIVE);
      expect(campaignRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CampaignStatus.ACTIVE }),
      );
    });

    it("should throw 409 Conflict if campaign is already active", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.ACTIVE,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.activate(agencyId, campaignId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw 409 Conflict if campaign is closed", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.CLOSED,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.activate(agencyId, campaignId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("close", () => {
    it("should close active campaign, increment analysis version, and enqueue campaign_closed analysis", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.ACTIVE,
        name: "Active Campaign",
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);
      analysisRepo.findOne.mockResolvedValue({
        version: 1,
      } as CampaignAnalysis);

      const result = await service.close(agencyId, campaignId);
      expect(result.status).toBe(CampaignStatus.CLOSED);
      expect(analysisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId,
          version: 2,
          status: CampaignAnalysisStatus.PENDING,
          trigger: CampaignAnalysisTrigger.CAMPAIGN_CLOSED,
          isStale: false,
        }),
      );
      expect(producer.enqueueCampaignAnalysis).toHaveBeenCalledWith(
        campaignId,
        "analysis-uuid-1",
        CampaignAnalysisTrigger.CAMPAIGN_CLOSED,
      );
    });

    it("should start version at 1 if no previous analyses exist on close", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.ACTIVE,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);
      analysisRepo.findOne.mockResolvedValue(null);

      await service.close(agencyId, campaignId);
      expect(analysisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1 }),
      );
    });

    it("should throw 409 Conflict if closing draft campaign", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.DRAFT,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.close(agencyId, campaignId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw 409 Conflict if closing already closed campaign", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.CLOSED,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.close(agencyId, campaignId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("reopen", () => {
    it("should reopen closed campaign to active and mark previous analyses stale without deleting them", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.CLOSED,
        name: "Closed Campaign",
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      const result = await service.reopen(agencyId, campaignId);
      expect(result.status).toBe(CampaignStatus.ACTIVE);
      expect(analysisRepo.update).toHaveBeenCalledWith(
        { campaignId, isStale: false },
        { isStale: true, status: CampaignAnalysisStatus.STALE },
      );
    });

    it("should throw 409 Conflict if reopening draft campaign", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.DRAFT,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.reopen(agencyId, campaignId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw 409 Conflict if reopening already active campaign", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.ACTIVE,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.reopen(agencyId, campaignId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("analyze", () => {
    it("should trigger manual analysis on active campaign and create new versioned analysis row", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.ACTIVE,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);
      analysisRepo.findOne.mockResolvedValue({
        version: 2,
      } as CampaignAnalysis);

      const result = await service.analyze(agencyId, campaignId);
      expect(analysisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId,
          version: 3,
          status: CampaignAnalysisStatus.PENDING,
          trigger: CampaignAnalysisTrigger.MANUAL,
          isStale: false,
        }),
      );
      expect(producer.enqueueCampaignAnalysis).toHaveBeenCalledWith(
        campaignId,
        "analysis-uuid-1",
        CampaignAnalysisTrigger.MANUAL,
      );
      expect(result).toHaveProperty("version", 3);
      expect(result).toHaveProperty("trigger", CampaignAnalysisTrigger.MANUAL);
    });

    it("should throw 400 Bad Request if analyzing draft campaign", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.DRAFT,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.analyze(agencyId, campaignId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw 400 Bad Request if analyzing closed campaign", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        status: CampaignStatus.CLOSED,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(service.analyze(agencyId, campaignId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("ensureCampaignAcceptsSubmissions", () => {
    it("should succeed and return campaign if campaign is active", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Spring Launch",
        status: CampaignStatus.ACTIVE,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      const result = await service.ensureCampaignAcceptsSubmissions(
        agencyId,
        campaignId,
      );
      expect(result).toEqual(mockCampaign);
    });

    it("should throw 409 Conflict if campaign is draft", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Spring Launch",
        status: CampaignStatus.DRAFT,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(
        service.ensureCampaignAcceptsSubmissions(agencyId, campaignId),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw 409 Conflict if campaign is closed", async () => {
      const mockCampaign = {
        id: campaignId,
        agencyId,
        name: "Spring Launch",
        status: CampaignStatus.CLOSED,
      };
      campaignRepo.findOne.mockResolvedValue(mockCampaign as Campaign);

      await expect(
        service.ensureCampaignAcceptsSubmissions(agencyId, campaignId),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw 404 NotFound if campaign does not exist for agency", async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(
        service.ensureCampaignAcceptsSubmissions(agencyId, campaignId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
