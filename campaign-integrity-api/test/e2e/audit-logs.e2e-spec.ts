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
  AuditActorType,
  AuditLog,
  User,
  UserRole,
  UserStatus,
} from "../../src/database/entities";

describe("Audit Logs Querying & Scoping (Integration / E2E)", () => {
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
  let viewerTokenAgencyA: string;
  let adminTokenAgencyB: string;
  let reviewerTokenAgencyB: string;

  let adminAUser: User;
  let reviewerAUser: User;

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
    const auditLogRepo = dataSource.getRepository(AuditLog);

    agencyA = await agencyRepo.save(
      agencyRepo.create({
        name: "Audit Agency Alpha",
        slug: `audit-agency-alpha-${Date.now()}`,
        contactEmail: "audit-alpha@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    agencyB = await agencyRepo.save(
      agencyRepo.create({
        name: "Audit Agency Beta",
        slug: `audit-agency-beta-${Date.now()}`,
        contactEmail: "audit-beta@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    const platformAdmin = await userRepo.save(
      userRepo.create({
        email: `platform-admin-audit-${Date.now()}@platform.local`,
        agencyId: null,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    adminAUser = await userRepo.save(
      userRepo.create({
        email: `admin-a-audit-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    reviewerAUser = await userRepo.save(
      userRepo.create({
        email: `reviewer-a-audit-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.FRAUD_REVIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const managerA = await userRepo.save(
      userRepo.create({
        email: `manager-a-audit-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.CAMPAIGN_MANAGER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const viewerA = await userRepo.save(
      userRepo.create({
        email: `viewer-a-audit-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const adminB = await userRepo.save(
      userRepo.create({
        email: `admin-b-audit-${Date.now()}@beta.com`,
        agencyId: agencyB.id,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const reviewerB = await userRepo.save(
      userRepo.create({
        email: `reviewer-b-audit-${Date.now()}@beta.com`,
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
      { sub: adminAUser.id, agencyId: agencyA.id, role: UserRole.AGENCY_ADMIN, email: adminAUser.email },
      { secret, expiresIn: "1h" },
    );
    reviewerTokenAgencyA = jwtService.sign(
      { sub: reviewerAUser.id, agencyId: agencyA.id, role: UserRole.FRAUD_REVIEWER, email: reviewerAUser.email },
      { secret, expiresIn: "1h" },
    );
    managerTokenAgencyA = jwtService.sign(
      { sub: managerA.id, agencyId: agencyA.id, role: UserRole.CAMPAIGN_MANAGER, email: managerA.email },
      { secret, expiresIn: "1h" },
    );
    viewerTokenAgencyA = jwtService.sign(
      { sub: viewerA.id, agencyId: agencyA.id, role: UserRole.VIEWER, email: viewerA.email },
      { secret, expiresIn: "1h" },
    );
    adminTokenAgencyB = jwtService.sign(
      { sub: adminB.id, agencyId: agencyB.id, role: UserRole.AGENCY_ADMIN, email: adminB.email },
      { secret, expiresIn: "1h" },
    );
    reviewerTokenAgencyB = jwtService.sign(
      { sub: reviewerB.id, agencyId: agencyB.id, role: UserRole.FRAUD_REVIEWER, email: reviewerB.email },
      { secret, expiresIn: "1h" },
    );

    // Seed test audit logs for agencyA and agencyB
    await auditLogRepo.save([
      auditLogRepo.create({
        agencyId: agencyA.id,
        actorType: AuditActorType.USER,
        actorId: adminAUser.id,
        action: "campaign.created",
        resourceType: "campaign",
        resourceId: "11111111-1111-1111-1111-111111111111",
        createdAt: new Date("2026-08-10T10:00:00.000Z"),
      }),
      auditLogRepo.create({
        agencyId: agencyA.id,
        actorType: AuditActorType.USER,
        actorId: reviewerAUser.id,
        action: "submission.reviewed",
        resourceType: "submission",
        resourceId: "22222222-2222-2222-2222-222222222222",
        createdAt: new Date("2026-08-12T14:30:00.000Z"),
      }),
      auditLogRepo.create({
        agencyId: agencyB.id,
        actorType: AuditActorType.USER,
        actorId: adminB.id,
        action: "campaign.created",
        resourceType: "campaign",
        resourceId: "33333333-3333-3333-3333-333333333333",
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
      }),
    ]);
  }, 60000);

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (app) {
      await app.close();
    }
  });

  describe("GET /v1/audit-logs (RBAC & Multi-Tenancy Scoping)", () => {
    it("agency_admin can query audit logs for their agency (200 OK)", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      for (const item of res.body.data) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("action");
        expect(item).toHaveProperty("actorType");
        expect(item).toHaveProperty("actorId");
        expect(item).toHaveProperty("createdAt");
        expect(item).not.toHaveProperty("metadata");
      }
    });

    it("fraud_reviewer can query audit logs for their agency (200 OK)", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs")
        .set("Authorization", `Bearer ${reviewerTokenAgencyA}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });

    it("campaign_manager is rejected with 403 FORBIDDEN", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("viewer is rejected with 403 FORBIDDEN", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs")
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("Agency B admin only sees Agency B logs (strict multi-tenancy isolation)", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs")
        .set("Authorization", `Bearer ${adminTokenAgencyB}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].resourceId).toBe(
        "33333333-3333-3333-3333-333333333333",
      );
    });

    it("non-platform role passing agencyId query param has it ignored (scoped to own agency)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/audit-logs?agencyId=${agencyB.id}`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      // Agency A admin still only sees Agency A logs
      expect(res.body.data.length).toBe(2);
    });
  });

  describe("GET /v1/audit-logs (Filtering & Pagination)", () => {
    it("filters by action", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs?action=submission.reviewed")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe("submission.reviewed");
    });

    it("filters by actorId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/audit-logs?actorId=${adminAUser.id}`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].actorId).toBe(adminAUser.id);
    });

    it("filters by date range (dateFrom / dateTo)", async () => {
      const res = await request(app.getHttpServer())
        .get(
          "/v1/audit-logs?dateFrom=2026-08-11T00:00:00.000Z&dateTo=2026-08-13T00:00:00.000Z",
        )
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe("submission.reviewed");
    });

    it("paginates results correctly", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs?page=1&pageSize=1")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 1,
      });
    });
  });

  describe("GET /v1/audit-logs (platform_admin Scoping)", () => {
    it("platform_admin without agencyId query param is rejected with 400 VALIDATION_ERROR", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/audit-logs")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("platform_admin with agencyId query param can query audit logs for any agency", async () => {
      const resAgencyA = await request(app.getHttpServer())
        .get(`/v1/audit-logs?agencyId=${agencyA.id}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(resAgencyA.body.data.length).toBe(2);

      const resAgencyB = await request(app.getHttpServer())
        .get(`/v1/audit-logs?agencyId=${agencyB.id}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(resAgencyB.body.data.length).toBe(1);
      expect(resAgencyB.body.data[0].resourceId).toBe(
        "33333333-3333-3333-3333-333333333333",
      );
    });
  });

  describe("Live End-to-End Interceptor Audit Action Verification", () => {
    it("verifies campaign creation action written by AuditInterceptor appears in query results", async () => {
      // 1. Create a campaign as Agency A manager (triggers campaign.created)
      const createRes = await request(app.getHttpServer())
        .post("/v1/campaigns")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({ name: "Audit Trail Verified Campaign" })
        .expect(201);

      const campaignId = createRes.body.id;

      // Allow async fire-and-forget interceptor insert to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 2. Query audit logs as Agency A admin
      const logsRes = await request(app.getHttpServer())
        .get(`/v1/audit-logs?action=campaign.created`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      const createdEntry = logsRes.body.data.find(
        (entry: any) => entry.resourceId === campaignId,
      );
      expect(createdEntry).toBeDefined();
      expect(createdEntry.action).toBe("campaign.created");
      expect(createdEntry.resourceType).toBe("campaign");
    });
  });
});
