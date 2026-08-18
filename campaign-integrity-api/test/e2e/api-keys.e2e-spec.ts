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
  ApiKey,
  AuditLog,
  User,
  UserRole,
  UserStatus,
} from "../../src/database/entities";

describe("API Keys Lifecycle, Guard & RBAC (Integration / E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: AppConfigService;

  let agencyA: Agency;
  let agencyB: Agency;

  let platformAdminToken: string;
  let adminTokenAgencyA: string;
  let managerTokenAgencyA: string;
  let viewerTokenAgencyA: string;
  let adminTokenAgencyB: string;

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

    agencyA = await agencyRepo.save(
      agencyRepo.create({
        name: "Agency Alpha API Keys",
        slug: `agency-alpha-keys-${Date.now()}`,
        contactEmail: "alpha-keys@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    agencyB = await agencyRepo.save(
      agencyRepo.create({
        name: "Agency Beta API Keys",
        slug: `agency-beta-keys-${Date.now()}`,
        contactEmail: "beta-keys@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

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
        email: `admin-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
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

    const adminB = await userRepo.save(
      userRepo.create({
        email: `admin-b-${Date.now()}@beta.com`,
        agencyId: agencyB.id,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    const secret = configService.jwt.accessSecret;

    platformAdminToken = jwtService.sign(
      { sub: platformAdmin.id, agencyId: null, role: UserRole.PLATFORM_ADMIN },
      { secret, expiresIn: "1h" },
    );

    adminTokenAgencyA = jwtService.sign(
      { sub: adminA.id, agencyId: agencyA.id, role: UserRole.AGENCY_ADMIN },
      { secret, expiresIn: "1h" },
    );

    managerTokenAgencyA = jwtService.sign(
      { sub: managerA.id, agencyId: agencyA.id, role: UserRole.CAMPAIGN_MANAGER },
      { secret, expiresIn: "1h" },
    );

    viewerTokenAgencyA = jwtService.sign(
      { sub: viewerA.id, agencyId: agencyA.id, role: UserRole.VIEWER },
      { secret, expiresIn: "1h" },
    );

    adminTokenAgencyB = jwtService.sign(
      { sub: adminB.id, agencyId: agencyB.id, role: UserRole.AGENCY_ADMIN },
      { secret, expiresIn: "1h" },
    );
  }, 30000);

  afterAll(async () => {
    // Allow pending background audit interceptor inserts to finish
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (app) {
      await app.close();
    }
  });

  describe("POST /v1/api-keys (Creation & Permissions)", () => {
    it("should allow agency_admin to create an API key and return secret once", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Agency A Prod Key",
          scopes: ["campaigns:read", "campaigns:write"],
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("key");
      expect(res.body).toHaveProperty("keyPrefix");
      expect(res.body.key).toMatch(/^ci_live_/);
      expect(res.body.keyPrefix).toBe(res.body.key.slice(0, 12));
    });

    it("should allow platform_admin to create an API key when providing explicit agencyId", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          name: "Platform Admin Created Key for Agency B",
          scopes: ["campaigns:read"],
          agencyId: agencyB.id,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("key");
      expect(res.body.key).toMatch(/^ci_live_/);
    });

    it("should reject platform_admin creation with 400 VALIDATION_ERROR when agencyId is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          name: "Platform Admin Missing Agency",
          scopes: ["campaigns:read"],
        })
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should reject agency_admin attempting to pass foreign agencyId with 403 Forbidden", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Agency A Admin trying to create for Agency B",
          scopes: ["campaigns:read"],
          agencyId: agencyB.id,
        })
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("should reject creation with 403 Forbidden for non-admin roles (campaign_manager, viewer)", async () => {
      await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .send({
          name: "Manager Key Attempt",
          scopes: ["campaigns:read"],
        })
        .expect(403);

      await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .send({
          name: "Viewer Key Attempt",
          scopes: ["campaigns:read"],
        })
        .expect(403);
    });

    it("should reject creation with 400 VALIDATION_ERROR on invalid scopes", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Invalid Scope Key",
          scopes: ["invalid:scope", "campaigns:read"],
        })
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should reject creation with 400 VALIDATION_ERROR on empty scopes", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Empty Scope Key",
          scopes: [],
        })
        .expect(400);

      expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should reject creation when authenticating with an API key instead of dashboard JWT", async () => {
      // First create a valid key
      const createRes = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Key for Dual Auth Test",
          scopes: ["campaigns:read"],
        })
        .expect(201);

      const apiKeySecret = createRes.body.key;

      // Attempt to create another key using the API key
      const res = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${apiKeySecret}`)
        .send({
          name: "Attempt Nested Key",
          scopes: ["campaigns:read"],
        })
        .expect(401);

      expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
    });
  });

  describe("GET /v1/api-keys (Listing & Security / Leak Prevention)", () => {
    it("should list keys for the agency and NEVER expose key secret or keyHash", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const item of res.body.data) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("keyPrefix");
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("scopes");
        expect(item).toHaveProperty("createdAt");
        expect(item).toHaveProperty("lastUsedAt");
        expect(item).toHaveProperty("revokedAt");

        // Strict security assertions:
        expect((item as any).key).toBeUndefined();
        expect((item as any).keyHash).toBeUndefined();
        expect((item as any).secret).toBeUndefined();
      }
    });

    it("should allow platform_admin to list keys across all agencies", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/api-keys")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      // Contains keys created for both Agency A and Agency B
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should isolate keys between agencies (Agency B cannot see Agency A keys)", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyB}`)
        .expect(200);

      // Agency B only sees the key created for Agency B by platform_admin
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Platform Admin Created Key for Agency B");
    });

    it("should reject listing with 403 Forbidden for non-admin roles", async () => {
      await request(app.getHttpServer())
        .get("/v1/api-keys")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(403);

      await request(app.getHttpServer())
        .get("/v1/api-keys")
        .set("Authorization", `Bearer ${viewerTokenAgencyA}`)
        .expect(403);
    });
  });

  describe("DELETE /v1/api-keys/:id & ApiKeyGuard Usage Verification", () => {
    let createdKeyId: string;
    let createdKeySecret: string;

    beforeEach(async () => {
      const createRes = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Key to be revoked",
          scopes: ["campaigns:read"],
        })
        .expect(201);

      createdKeyId = createRes.body.id;
      createdKeySecret = createRes.body.key;
    });

    it("should allow valid active API key to access scoped endpoints (GET /v1/campaigns)", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/campaigns")
        .set("Authorization", `Bearer ${createdKeySecret}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
    });

    it("should reject API key missing required scope with 403 Forbidden", async () => {
      // Endpoint POST /v1/campaigns requires campaigns:write
      const res = await request(app.getHttpServer())
        .post("/v1/campaigns")
        .set("Authorization", `Bearer ${createdKeySecret}`)
        .send({ name: "Unauthorized Campaign Create" })
        .expect(403);

      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("should return 404 NOT_FOUND on cross-agency DELETE by agency_admin", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/api-keys/${createdKeyId}`)
        .set("Authorization", `Bearer ${adminTokenAgencyB}`)
        .expect(404);

      expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
    });

    it("should allow platform_admin to revoke key belonging to any agency (204 No Content)", async () => {
      await request(app.getHttpServer())
        .delete(`/v1/api-keys/${createdKeyId}`)
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(204);

      // Verify immediate rejection on subsequent request (AAD §3.4)
      const res = await request(app.getHttpServer())
        .get("/v1/campaigns")
        .set("Authorization", `Bearer ${createdKeySecret}`)
        .expect(401);

      expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("should revoke API key with 204 No Content and immediately block subsequent requests (401)", async () => {
      // Revoke key as agency_admin
      await request(app.getHttpServer())
        .delete(`/v1/api-keys/${createdKeyId}`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(204);

      // Verify immediate rejection on subsequent request (AAD §3.4)
      const res = await request(app.getHttpServer())
        .get("/v1/campaigns")
        .set("Authorization", `Bearer ${createdKeySecret}`)
        .expect(401);

      expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");

      // Verify revoked_at is populated in GET /v1/api-keys
      const listRes = await request(app.getHttpServer())
        .get("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      const revokedItem = listRes.body.data.find(
        (k: any) => k.id === createdKeyId,
      );
      expect(revokedItem).toBeDefined();
      expect(revokedItem.revokedAt).not.toBeNull();
    });
  });

  describe("Audit Logging Verification", () => {
    it("should record api_key.created and api_key.revoked in audit_logs", async () => {
      const auditLogRepo = dataSource.getRepository(AuditLog);

      const createRes = await request(app.getHttpServer())
        .post("/v1/api-keys")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          name: "Audit Test Key",
          scopes: ["campaigns:read"],
        })
        .expect(201);

      const keyId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/v1/api-keys/${keyId}`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(204);

      // Allow async fire-and-forget audit interceptor insert to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      const createLog = await auditLogRepo.findOne({
        where: { action: "api_key.created", resourceId: keyId },
      });
      expect(createLog).toBeDefined();
      expect(createLog?.agencyId).toBe(agencyA.id);
      expect(createLog?.resourceType).toBe("api_key");

      const revokeLog = await auditLogRepo.findOne({
        where: { action: "api_key.revoked", resourceId: keyId },
      });
      expect(revokeLog).toBeDefined();
      expect(revokeLog?.agencyId).toBe(agencyA.id);
      expect(revokeLog?.resourceType).toBe("api_key");
    });
  });
});
