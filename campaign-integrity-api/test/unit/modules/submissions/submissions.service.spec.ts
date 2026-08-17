import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { SubmissionsService } from "../../../../src/modules/submissions/submissions.service";
import {
  Analysis,
  AnalysisStatus,
  Finding,
  RiskLevel,
  Submission,
  SubmissionStatus,
} from "../../../../src/database/entities";
import { AnalysisProducer } from "../../../../src/queue/producers/analysis.producer";
import { EvidenceGeneratorService } from "../../../../src/modules/detection/evidence/evidence-generator.service";
import { CampaignsService } from "../../../../src/modules/campaigns/campaigns.service";
import { CreatorHistoryService } from "../../../../src/modules/intelligence/creator-history.service";

describe("SubmissionsService (Unit)", () => {
  let service: SubmissionsService;
  let submissionRepo: jest.Mocked<Repository<Submission>>;
  let analysisRepo: jest.Mocked<Repository<Analysis>>;
  let findingRepo: jest.Mocked<Repository<Finding>>;
  let producer: jest.Mocked<AnalysisProducer>;
  let evidenceGenerator: jest.Mocked<EvidenceGeneratorService>;
  let campaignsService: jest.Mocked<CampaignsService>;
  let creatorHistoryService: jest.Mocked<CreatorHistoryService>;

  const agencyId = "11111111-1111-1111-1111-111111111111";
  const userId = "99999999-9999-9999-9999-999999999999";
  const submissionId = "22222222-2222-2222-2222-222222222222";
  const creatorId = "33333333-3333-3333-3333-333333333333";
  const analysisId = "44444444-4444-4444-4444-444444444444";

  beforeEach(() => {
    submissionRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((dto) => ({
        id: submissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    } as unknown as jest.Mocked<Repository<Submission>>;

    analysisRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Analysis>>;

    findingRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<Finding>>;

    producer = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AnalysisProducer>;

    evidenceGenerator = {
      generate: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<EvidenceGeneratorService>;

    campaignsService = {
      ensureCampaignAcceptsSubmissions: jest.fn().mockResolvedValue({} as any),
    } as unknown as jest.Mocked<CampaignsService>;

    creatorHistoryService = {
      getCreatorContext: jest.fn().mockResolvedValue({
        accountAgeSummary: "Account created 3 years ago",
        followerCount: 12500,
        priorSubmissionsCount: 2,
        priorSubmissionsAvgRiskScore: 42,
      }),
    } as unknown as jest.Mocked<CreatorHistoryService>;

    service = new SubmissionsService(
      submissionRepo,
      analysisRepo,
      findingRepo,
      producer,
      evidenceGenerator,
      campaignsService,
      creatorHistoryService,
    );
  });

  describe("review", () => {
    it("should update reviewer note and set reviewedBy/reviewedAt when markReviewed is true", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId,
        status: SubmissionStatus.COMPLETED,
        reviewerNote: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      };
      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);

      const result = await service.review(agencyId, userId, submissionId, {
        reviewerNote: "Inorganic spike detected.",
        markReviewed: true,
      });

      expect(mockSubmission.reviewerNote).toBe("Inorganic spike detected.");
      expect(mockSubmission.reviewedBy).toBe(userId);
      expect(mockSubmission.reviewedAt).toBeInstanceOf(Date);
      expect(result.reviewerNote).toBe("Inorganic spike detected.");
      expect(result.reviewedBy).toBe(userId);
    });

    it("should allow updating only reviewer note without marking reviewed", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId,
        status: SubmissionStatus.COMPLETED,
        reviewerNote: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      };
      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);

      const result = await service.review(agencyId, userId, submissionId, {
        reviewerNote: "Initial draft note.",
        markReviewed: false,
      });

      expect(mockSubmission.reviewerNote).toBe("Initial draft note.");
      expect(mockSubmission.reviewedBy).toBeNull();
      expect(mockSubmission.reviewedAt).toBeNull();
      expect(result.reviewedBy).toBeNull();
    });

    it("should allow platform_admin (agencyId === null) to review submission from any agency", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId: "different-agency-id",
        status: SubmissionStatus.COMPLETED,
        reviewerNote: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      };
      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);

      const result = await service.review(null, userId, submissionId, {
        reviewerNote: "Platform admin review note.",
        markReviewed: true,
      });

      expect(submissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: submissionId },
      });
      expect(result.reviewerNote).toBe("Platform admin review note.");
      expect(result.reviewedBy).toBe(userId);
    });

    it("should throw NotFoundException (404) if submission belongs to another agency", async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.review(agencyId, userId, submissionId, {
          reviewerNote: "Attempt",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getLatestAnalysis with creatorContext", () => {
    it("should include creatorContext when submission has creatorId", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId,
        creatorId,
        status: SubmissionStatus.COMPLETED,
      };
      const mockAnalysis: Partial<Analysis> = {
        id: analysisId,
        submissionId,
        riskScore: 72,
        riskLevel: RiskLevel.HIGH,
        status: AnalysisStatus.COMPLETED,
        analysisVersion: "engine-1.0",
        completedAt: new Date(),
      };

      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);
      analysisRepo.findOne.mockResolvedValue(mockAnalysis as Analysis);

      const result = await service.getLatestAnalysis(agencyId, submissionId);

      expect(result).toHaveProperty("creatorContext");
      expect(result.creatorContext).toEqual({
        accountAgeSummary: "Account created 3 years ago",
        followerCount: 12500,
        priorSubmissionsCount: 2,
        priorSubmissionsAvgRiskScore: 42,
      });
      expect(creatorHistoryService.getCreatorContext).toHaveBeenCalledWith(
        creatorId,
        agencyId,
        submissionId,
      );
    });

    it("should allow platform_admin (agencyId === null) to fetch analysis by submissionId alone", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId: "different-agency-id",
        creatorId,
        status: SubmissionStatus.COMPLETED,
      };
      const mockAnalysis: Partial<Analysis> = {
        id: analysisId,
        submissionId,
        riskScore: 72,
        riskLevel: RiskLevel.HIGH,
        status: AnalysisStatus.COMPLETED,
        analysisVersion: "engine-1.0",
        completedAt: new Date(),
      };

      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);
      analysisRepo.findOne.mockResolvedValue(mockAnalysis as Analysis);

      const result = await service.getLatestAnalysis(null, submissionId);

      expect(submissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: submissionId },
      });
      expect(result.analysisId).toBe(analysisId);
    });

    it("should return creatorContext: null when creatorId is null (unresolved creator)", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId,
        creatorId: null,
        status: SubmissionStatus.COMPLETED,
      };
      const mockAnalysis: Partial<Analysis> = {
        id: analysisId,
        submissionId,
        riskScore: 30,
        riskLevel: RiskLevel.LOW,
        status: AnalysisStatus.COMPLETED,
        analysisVersion: "engine-1.0",
        completedAt: new Date(),
      };

      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);
      analysisRepo.findOne.mockResolvedValue(mockAnalysis as Analysis);

      const result = await service.getLatestAnalysis(agencyId, submissionId);

      expect(result.creatorContext).toBeNull();
      expect(creatorHistoryService.getCreatorContext).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException (404) if no completed analysis exists yet", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId,
      };
      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);
      analysisRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getLatestAnalysis(agencyId, submissionId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw UnprocessableEntityException (422) if analysis status is failed", async () => {
      const mockSubmission: Partial<Submission> = {
        id: submissionId,
        agencyId,
        creatorId,
      };
      const mockAnalysis: Partial<Analysis> = {
        id: analysisId,
        submissionId,
        status: AnalysisStatus.FAILED,
      };

      submissionRepo.findOne.mockResolvedValue(mockSubmission as Submission);
      analysisRepo.findOne.mockResolvedValue(mockAnalysis as Analysis);

      await expect(
        service.getLatestAnalysis(agencyId, submissionId),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
