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
  AuditLog,
  Campaign,
  CampaignAnalysis,
  CampaignAnalysisStatus,
  CampaignAnalysisTrigger,
  CampaignStatus,
  User,
  UserRole,
  UserStatus,
} from "../../src/database/entities";

describe("Campaigns API Lifecycle & Scoping (Integration / E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: AppConfigService;

  let agencyA: Agency;
  let agencyB: Agency;

  let managerTokenAgencyA: string;
  let viewerTokenAgencyA: string;
  let managerTokenAgencyB: string;

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

    // Setup seeded test agencies and users
    const agencyRepo = dataSource.getRepository(Agency);
    const userRepo = dataSource.getRepository(User);

    agencyA = await agencyRepo.save(
      agencyRepo.create({
        name: "Agency Alpha",
        slug: `agency-alpha-${Date.now()}`,
        contactEmail: "alpha@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    agencyB = await agencyRepo.save(
      agencyRepo.create({
        name: "Agency Beta",
        slug: `agency-beta-${Date.now()}`,
        contactEmail: "beta@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    const managerA = await userRepo.save(
      userRepo.create({
        email: `manager-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.CAMPAIGN_MANAGER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const viewerA = await userRepo.save(
      userRepo.create({
        email: `viewer-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const managerB = await userRepo.save(
      userRepo.create({
        email: `manager-b-${Date.now()}@beta.com`,
        agencyId: agencyB.id,
        role: UserRole.CAMPAIGN_MANAGER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const secret = configService.jwt.accessSecret;
    managerTokenAgencyA = jwtService.sign(
      { sub: managerA.id, agencyId: agencyA.id, role: UserRole.CAMPAIGN_MANAGER },
      { secret, expiresIn: "1h" },
    );

    viewerTokenAgencyA = jwtService.sign(
      { sub: viewerA.id, agencyId: agencyA.id, role: UserRole.VIEWER },
      { secret, expiresIn: "1h" },
    );

    managerTokenAgencyB = jwtService.sign(
      { sub: managerB.id, agencyId: agencyB.id, role: UserRole.CAMPAIGN_MANAGER },
      { secret, expiresIn: "1h" },
    );
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Full Campaign Lifecycle Round-Trip", () => {
    let createdCampaignId: string;

    it("Step 1: POST /v1/campaigns — creates campaign in draft status", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/campaigns")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          name: "Summer Blast 2026",
          externalCampaignId: "sb-2026",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Summer Blast 2026");
      expect(res.body.externalCampaignId).toBe("sb-2026");
      expect(res.body.status).toBe(CampaignStatus.DRAFT);
      createdCampaignId = res.body.id;
    });

    it("Step 2: GET /v1/campaigns — lists campaigns for agency", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/campaigns")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.data.some((c: Campaign) => c.id === createdCampaignId)).toBe(true);
    });

    it("Step 3: Submitting to draft campaign should be rejected", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          postUrl: "https://x.com/creator1/status/1000000000000000001",
          campaignId: createdCampaignId,
        })
        .expect(409);

      expect(res.body.error).toHaveProperty("code", "CONFLICT");
    });

    it("Step 4: PATCH /v1/campaigns/:id/activate — activates draft campaign", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/campaigns/${createdCampaignId}/activate`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(200);

      expect(res.body.status).toBe(CampaignStatus.ACTIVE);
    });

    it("Step 5: Activating already active campaign returns 409", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/campaigns/${createdCampaignId}/activate`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(409);

      expect(res.body.error).toHaveProperty("code", "CONFLICT");
    });

    it("Step 6: Submit fixture submission to active campaign — accepted", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          postUrl: "https://x.com/creator1/status/1000000000000000002",
          campaignId: createdCampaignId,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.campaignId).toBe(createdCampaignId);
    });

    it("Step 7: POST /v1/campaigns/:id/analyze — manual analysis trigger on active campaign", async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/campaigns/${createdCampaignId}/analyze`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(201);

      expect(res.body).toHaveProperty("analysisId");
      expect(res.body.version).toBe(1);
      expect(res.body.trigger).toBe(CampaignAnalysisTrigger.MANUAL);

      // Verify campaign remains active
      const check = await request(app.getHttpServer())
        .get(`/v1/campaigns/${createdCampaignId}`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(200);

      expect(check.body.status).toBe(CampaignStatus.ACTIVE);
    });

    it("Step 8: PATCH /v1/campaigns/:id/close — closes campaign and creates versioned CampaignAnalysis", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/campaigns/${createdCampaignId}/close`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(200);

      expect(res.body.status).toBe(CampaignStatus.CLOSED);

      // Check CampaignAnalysis row created with trigger=campaign_closed and version=2
      const analysisRepo = dataSource.getRepository(CampaignAnalysis);
      const analyses = await analysisRepo.find({
        where: { campaignId: createdCampaignId },
        order: { version: "ASC" },
      });

      expect(analyses).toHaveLength(2);
      expect(analyses[1].version).toBe(2);
      expect(analyses[1].trigger).toBe(CampaignAnalysisTrigger.CAMPAIGN_CLOSED);
      expect(analyses[1].isStale).toBe(false);
    });

    it("Step 9: Submissions rejected once campaign is closed", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          postUrl: "https://x.com/creator1/status/1000000000000000003",
          campaignId: createdCampaignId,
        })
        .expect(409);

      expect(res.body.error).toHaveProperty("code", "CONFLICT");
    });

    it("Step 10: Manual analyze rejected on closed campaign with 400", async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/campaigns/${createdCampaignId}/analyze`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("Step 11: PATCH /v1/campaigns/:id/reopen — reopens closed campaign and marks previous analyses stale", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/campaigns/${createdCampaignId}/reopen`)
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(200);

      expect(res.body.status).toBe(CampaignStatus.ACTIVE);

      // Assert prior analyses marked stale without deleting them (audit-trail principle)
      const analysisRepo = dataSource.getRepository(CampaignAnalysis);
      const analyses = await analysisRepo.find({
        where: { campaignId: createdCampaignId },
        order: { version: "ASC" },
      });

      expect(analyses).toHaveLength(2);
      expect(analyses[0].isStale).toBe(true);
      expect(analyses[0].status).toBe(CampaignAnalysisStatus.STALE);
      expect(analyses[1].isStale).toBe(true);
      expect(analyses[1].status).toBe(CampaignAnalysisStatus.STALE);
    });

    it("Step 12: New submissions accepted again after reopening", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          postUrl: "https://x.com/creator1/status/1000000000000000004",
          campaignId: createdCampaignId,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
    });

    it("Step 13: Mutating campaign actions write to audit_logs via AuditInterceptor", async () => {
      const auditRepo = dataSource.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { agencyId: agencyA.id, resourceType: "campaign" },
        order: { createdAt: "ASC" },
      });

      const actions = logs.map((l) => l.action);
      expect(actions).toContain("campaign.created");
      expect(actions).toContain("campaign.activated");
      expect(actions).toContain("campaign.closed");
      expect(actions).toContain("campaign.reopened");
      expect(actions).toContain("campaign.analyzed");
    });
  });

  describe("Security & Multi-Tenancy Scoping (AAD §5.2, §6)", () => {
    let campaignAgencyA: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/campaigns")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({ name: "Agency A Private Campaign" })
        .expect(201);
      campaignAgencyA = res.body.id;
    });

    it("Agency B manager receives 404 (not 403) when attempting to view Agency A campaign", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/campaigns/${campaignAgencyA}`)
        .set("Authorization", `Bearer ${managerTokenAgencyB}`)
        .expect(404);

      expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
    });

    it("Agency B manager receives 404 when attempting to mutate Agency A campaign", async () => {
      await request(app.getHttpServer())
        .patch(`/v1/campaigns/${campaignAgencyA}/activate`)
        .set("Authorization", `Bearer ${managerTokenAgencyB}`)
        .expect(404);
    });

    it("Agency B cannot submit post against Agency A campaign (receives 404)", async () => {
      await request(app.getHttpServer())
        .post("/v1/submissions")
        .set("Authorization", `Bearer ${managerTokenAgencyB}`)
        .send({
          postUrl: "https://x.com/creator/status/1234567890123456780",
          campaignId: campaignAgencyA,
        })
        .expect(404);
    });

    it("Viewer role cannot manage campaigns (403 Forbidden on create)", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/campaigns")
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .send({ name: "Viewer Attempt" })
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("Viewer role cannot mutate campaign (403 Forbidden on activate/close/analyze)", async () => {
      await request(app.getHttpServer())
        .patch(`/v1/campaigns/${campaignAgencyA}/activate`)
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/v1/campaigns/${campaignAgencyA}/close`)
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/v1/campaigns/${campaignAgencyA}/analyze`)
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .expect(403);
    });

    it("Viewer role CAN read campaigns for their agency (200 OK)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/campaigns/${campaignAgencyA}`)
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .expect(200);

      expect(res.body.id).toBe(campaignAgencyA);
    });
  });
});
