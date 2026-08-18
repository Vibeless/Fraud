import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";
import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../../src/config/app-config.service";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import {
  Agency,
  AgencyStatus,
  Analysis,
  AnalysisStatus,
  Creator,
  RiskLevel,
  Submission,
  SubmissionStatus,
  User,
  UserRole,
  UserStatus,
} from "../../src/database/entities";

describe("Submissions Review & Creator Context (Integration / E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: AppConfigService;

  let agencyA: Agency;
  let agencyB: Agency;

  let platformAdminToken: string;
  let adminTokenAgencyA: string;
  let reviewerTokenAgencyA: string;
  let managerTokenAgencyA: string;
  let reviewerTokenAgencyB: string;

  let creatorA: Creator;
  let submission1: Submission;
  let submission2: Submission;
  let currentSubmission: Submission;
  let unresolvedSubmission: Submission;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<AppConfigService>(AppConfigService);

    const agencyRepo = dataSource.getRepository(Agency);
    const userRepo = dataSource.getRepository(User);
    const creatorRepo = dataSource.getRepository(Creator);
    const submissionRepo = dataSource.getRepository(Submission);
    const analysisRepo = dataSource.getRepository(Analysis);

    // 1. Create Agencies
    agencyA = await agencyRepo.save(
      agencyRepo.create({
        name: "Review Test Agency A",
        slug: `review-agency-a-${Date.now()}`,
        contactEmail: "review-a@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    agencyB = await agencyRepo.save(
      agencyRepo.create({
        name: "Review Test Agency B",
        slug: `review-agency-b-${Date.now()}`,
        contactEmail: "review-b@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    // 2. Create Users
    const platformAdmin = await userRepo.save(
      userRepo.create({
        email: `platform-admin-${Date.now()}@campaignintegrity.local`,
        agencyId: null,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const adminA = await userRepo.save(
      userRepo.create({
        email: `admin-a-${Date.now()}@agencya.com`,
        agencyId: agencyA.id,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const reviewerA = await userRepo.save(
      userRepo.create({
        email: `reviewer-a-${Date.now()}@agencya.com`,
        agencyId: agencyA.id,
        role: UserRole.FRAUD_REVIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const managerA = await userRepo.save(
      userRepo.create({
        email: `manager-a-${Date.now()}@agencya.com`,
        agencyId: agencyA.id,
        role: UserRole.CAMPAIGN_MANAGER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const reviewerB = await userRepo.save(
      userRepo.create({
        email: `reviewer-b-${Date.now()}@agencyb.com`,
        agencyId: agencyB.id,
        role: UserRole.FRAUD_REVIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const secret = configService.jwt.accessSecret;
    platformAdminToken = jwtService.sign(
      { sub: platformAdmin.id, agencyId: null, role: UserRole.PLATFORM_ADMIN, email: platformAdmin.email },
      { secret, expiresIn: "1h" },
    );
    adminTokenAgencyA = jwtService.sign(
      { sub: adminA.id, agencyId: agencyA.id, role: UserRole.AGENCY_ADMIN, email: adminA.email },
      { secret, expiresIn: "1h" },
    );
    reviewerTokenAgencyA = jwtService.sign(
      { sub: reviewerA.id, agencyId: agencyA.id, role: UserRole.FRAUD_REVIEWER, email: reviewerA.email },
      { secret, expiresIn: "1h" },
    );
    managerTokenAgencyA = jwtService.sign(
      { sub: managerA.id, agencyId: agencyA.id, role: UserRole.CAMPAIGN_MANAGER, email: managerA.email },
      { secret, expiresIn: "1h" },
    );
    reviewerTokenAgencyB = jwtService.sign(
      { sub: reviewerB.id, agencyId: agencyB.id, role: UserRole.FRAUD_REVIEWER, email: reviewerB.email },
      { secret, expiresIn: "1h" },
    );

    // 3. Create Creator with cached profile (Account created 3 years ago, 12500 followers)
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
    creatorA = await creatorRepo.save(
      creatorRepo.create({
        xUserId: `x-user-${Date.now()}`,
        xUsername: "test_creator_alpha",
        cachedProfile: {
          createdAt: threeYearsAgo.toISOString(),
          followersCount: 12500,
          followingCount: 400,
        },
        firstSeenAt: threeYearsAgo,
        lastSeenAt: new Date(),
      }),
    );

    // 4. Create 2 Prior Submissions and Analyses for creatorA in agencyA (Scores: 40 and 60 -> Avg: 50)
    submission1 = await submissionRepo.save(
      submissionRepo.create({
        agencyId: agencyA.id,
        creatorId: creatorA.id,
        xPostUrl: "https://x.com/creator/status/1111111111111111111",
        xPostId: "1111111111111111111",
        status: SubmissionStatus.COMPLETED,
      }),
    );
    await analysisRepo.save(
      analysisRepo.create({
        submissionId: submission1.id,
        analysisVersion: "engine-1.0",
        riskScore: 40,
        riskLevel: RiskLevel.LOW,
        status: AnalysisStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );

    submission2 = await submissionRepo.save(
      submissionRepo.create({
        agencyId: agencyA.id,
        creatorId: creatorA.id,
        xPostUrl: "https://x.com/creator/status/2222222222222222222",
        xPostId: "2222222222222222222",
        status: SubmissionStatus.COMPLETED,
      }),
    );
    await analysisRepo.save(
      analysisRepo.create({
        submissionId: submission2.id,
        analysisVersion: "engine-1.0",
        riskScore: 60,
        riskLevel: RiskLevel.MODERATE,
        status: AnalysisStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );

    // 5. Current Submission & Analysis for creatorA (Target of tests)
    currentSubmission = await submissionRepo.save(
      submissionRepo.create({
        agencyId: agencyA.id,
        creatorId: creatorA.id,
        xPostUrl: "https://x.com/creator/status/3333333333333333333",
        xPostId: "3333333333333333333",
        status: SubmissionStatus.COMPLETED,
      }),
    );
    await analysisRepo.save(
      analysisRepo.create({
        submissionId: currentSubmission.id,
        analysisVersion: "engine-1.0",
        riskScore: 80,
        riskLevel: RiskLevel.HIGH,
        status: AnalysisStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );

    // 6. Submission with no creatorId (Unresolved creator)
    unresolvedSubmission = await submissionRepo.save(
      submissionRepo.create({
        agencyId: agencyA.id,
        creatorId: null,
        xPostUrl: "https://x.com/unknown/status/4444444444444444444",
        xPostId: "4444444444444444444",
        status: SubmissionStatus.COMPLETED,
      }),
    );
    await analysisRepo.save(
      analysisRepo.create({
        submissionId: unresolvedSubmission.id,
        analysisVersion: "engine-1.0",
        riskScore: 25,
        riskLevel: RiskLevel.LOW,
        status: AnalysisStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );
  }, 60000);

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (app) {
      await app.close();
    }
  });

  describe("PART 0: Auth Profile (/v1/auth/me)", () => {
    it("platform_admin calling GET /v1/auth/me succeeds and returns agencyId: null", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("email");
      expect(res.body).toHaveProperty("role", UserRole.PLATFORM_ADMIN);
      expect(res.body).toHaveProperty("agencyId", null);
    });

    it("agency user calling GET /v1/auth/me returns their agencyId", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("agencyId", agencyA.id);
      expect(res.body).toHaveProperty("role", UserRole.AGENCY_ADMIN);
    });
  });

  describe("PART 1: Reviewer Note Persistence (PATCH /v1/submissions/:id/review)", () => {
    it("fraud_reviewer can add note and mark submission reviewed (200 OK)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/submissions/${currentSubmission.id}/review`)
        .set("Authorization", `Bearer ${reviewerTokenAgencyA}`)
        .send({
          reviewerNote: "Inorganic follower burst confirmed. Escalating.",
          markReviewed: true,
        })
        .expect(200);

      expect(res.body.id).toBe(currentSubmission.id);
      expect(res.body.reviewerNote).toBe(
        "Inorganic follower burst confirmed. Escalating.",
      );
      expect(res.body).toHaveProperty("reviewedBy");
      expect(res.body).toHaveProperty("reviewedAt");
      expect(res.body.reviewedAt).not.toBeNull();
    });

    it("campaign_manager is rejected with 403 Forbidden", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/submissions/${currentSubmission.id}/review`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          reviewerNote: "Manager trying to review",
          markReviewed: true,
        })
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("Agency B reviewer is rejected with 404 Not Found (no cross-agency leakage)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/submissions/${currentSubmission.id}/review`)
        .set("Authorization", `Bearer ${reviewerTokenAgencyB}`)
        .send({
          reviewerNote: "Cross agency review attempt",
        })
        .expect(404);

      expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
    });
  });

  describe("PART 2: Creator Context in Analysis Response (GET /v1/submissions/:id/analysis)", () => {
    it("returns creatorContext with priorSubmissionsCount and priorSubmissionsAvgRiskScore", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/submissions/${currentSubmission.id}/analysis`)
        .set("Authorization", `Bearer ${reviewerTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("analysisId");
      expect(res.body).toHaveProperty("riskScore", 80);
      expect(res.body).toHaveProperty("riskLevel", "high");
      expect(res.body).toHaveProperty("riskSummary");
      expect(typeof res.body.riskSummary).toBe("string");
      expect(res.body.riskSummary).toContain("High risk");
      expect(res.body).toHaveProperty("creatorContext");

      const context = res.body.creatorContext;
      expect(context).not.toBeNull();
      expect(context.accountAgeSummary).toContain("Account created 3 years ago");
      expect(context.followerCount).toBe(12500);
      expect(context.priorSubmissionsCount).toBe(2);
      expect(context.priorSubmissionsAvgRiskScore).toBe(50); // (40 + 60) / 2 = 50

      // Confirm no internal data leaked
      expect(res.body).not.toHaveProperty("rawSignalSnapshot");
      expect(res.body).not.toHaveProperty("findings.details");
    });

    it("returns creatorContext: null when creatorId is null", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/submissions/${unresolvedSubmission.id}/analysis`)
        .set("Authorization", `Bearer ${reviewerTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("creatorContext", null);
    });
  });

  describe("PART 3: platform_admin Cross-Agency Submissions & Scoping", () => {
    let platformCreatedSubmissionAgencyB: string;

    it("platform_admin create with explicit agencyId succeeds (201 Created)", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          postUrl: "https://x.com/creator/status/5555555555555555555",
          agencyId: agencyB.id,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.postUrl).toBe("https://x.com/creator/status/5555555555555555555");
      platformCreatedSubmissionAgencyB = res.body.id;
    });

    it("platform_admin create without agencyId fails with 400 VALIDATION_ERROR", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          postUrl: "https://x.com/creator/status/6666666666666666666",
        })
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("agency_admin create with foreign agencyId in body fails with 403 FORBIDDEN", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          postUrl: "https://x.com/creator/status/7777777777777777777",
          agencyId: agencyB.id,
        })
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("platform_admin list without agencyId query param fails with 400 VALIDATION_ERROR", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/submissions")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("platform_admin list WITH agencyId query param returns only that agency's submissions", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/submissions?agencyId=${agencyB.id}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.find(
        (s: any) => s.id === platformCreatedSubmissionAgencyB,
      );
      expect(found).toBeDefined();
    });

    it("non-platform_admin role supplying agencyId query param on list has it ignored", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/submissions?agencyId=${agencyB.id}`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(200);

      const foundAgencyB = res.body.data.find(
        (s: any) => s.id === platformCreatedSubmissionAgencyB,
      );
      expect(foundAgencyB).toBeUndefined();
    });

    it("platform_admin can access any agency's submission by id for findById, review, and getLatestAnalysis", async () => {
      // findById on Agency A submission
      const getRes = await request(app.getHttpServer())
        .get(`/v1/submissions/${currentSubmission.id}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);
      expect(getRes.body.id).toBe(currentSubmission.id);

      // review on Agency A submission
      const reviewRes = await request(app.getHttpServer())
        .patch(`/v1/submissions/${currentSubmission.id}/review`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          reviewerNote: "Platform admin review verified.",
          markReviewed: true,
        })
        .expect(200);
      expect(reviewRes.body.reviewerNote).toBe("Platform admin review verified.");

      // getLatestAnalysis on Agency A submission
      const analysisRes = await request(app.getHttpServer())
        .get(`/v1/submissions/${currentSubmission.id}/analysis`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);
      expect(analysisRes.body.submissionId).toBe(currentSubmission.id);
    });
  });
});
