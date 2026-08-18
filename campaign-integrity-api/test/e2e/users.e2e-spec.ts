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
  User,
  UserRole,
  UserStatus,
} from "../../src/database/entities";

describe("Users Lifecycle, Guard & RBAC (Integration / E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: AppConfigService;

  let agencyA: Agency;
  let agencyB: Agency;

  let platformAdmin: User;
  let adminA: User;
  let managerA: User;
  let reviewerA: User;
  let viewerA: User;
  let adminB: User;

  let platformAdminToken: string;
  let adminTokenAgencyA: string;
  let managerTokenAgencyA: string;
  let reviewerTokenAgencyA: string;
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
        name: "Agency Alpha Users",
        slug: `agency-alpha-users-${Date.now()}`,
        contactEmail: "alpha-users@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    agencyB = await agencyRepo.save(
      agencyRepo.create({
        name: "Agency Beta Users",
        slug: `agency-beta-users-${Date.now()}`,
        contactEmail: "beta-users@agency.com",
        status: AgencyStatus.ACTIVE,
      }),
    );

    platformAdmin = await userRepo.save(
      userRepo.create({
        email: `platform-admin-${Date.now()}@campaignintegrity.local`,
        agencyId: null,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    adminA = await userRepo.save(
      userRepo.create({
        email: `admin-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.AGENCY_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    managerA = await userRepo.save(
      userRepo.create({
        email: `manager-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.CAMPAIGN_MANAGER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    reviewerA = await userRepo.save(
      userRepo.create({
        email: `reviewer-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.FRAUD_REVIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    viewerA = await userRepo.save(
      userRepo.create({
        email: `viewer-a-${Date.now()}@alpha.com`,
        agencyId: agencyA.id,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        passwordHash: "dummy-hash",
      }),
    );

    adminB = await userRepo.save(
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
      { sub: platformAdmin.id, agencyId: null, role: UserRole.PLATFORM_ADMIN, email: platformAdmin.email },
      { secret, expiresIn: "1h" },
    );

    adminTokenAgencyA = jwtService.sign(
      { sub: adminA.id, agencyId: agencyA.id, role: UserRole.AGENCY_ADMIN, email: adminA.email },
      { secret, expiresIn: "1h" },
    );

    managerTokenAgencyA = jwtService.sign(
      { sub: managerA.id, agencyId: agencyA.id, role: UserRole.CAMPAIGN_MANAGER, email: managerA.email },
      { secret, expiresIn: "1h" },
    );

    reviewerTokenAgencyA = jwtService.sign(
      { sub: reviewerA.id, agencyId: agencyA.id, role: UserRole.FRAUD_REVIEWER, email: reviewerA.email },
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
  }, 30000);

  afterAll(async () => {
    // Allow pending background audit interceptor inserts to finish
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (app) {
      await app.close();
    }
  });

  describe("POST /v1/users (Invite user)", () => {
    it("should allow agency_admin to invite a new user, returning status 'invited' and temporaryPassword once", async () => {
      const inviteEmail = `invited-${Date.now()}@alpha.com`;
      const res = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email: inviteEmail,
          role: UserRole.FRAUD_REVIEWER,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe(inviteEmail);
      expect(res.body.role).toBe(UserRole.FRAUD_REVIEWER);
      expect(res.body.status).toBe(UserStatus.INVITED);
      expect(res.body).toHaveProperty("temporaryPassword");
      expect(typeof res.body.temporaryPassword).toBe("string");
      expect(res.body.temporaryPassword.length).toBeGreaterThanOrEqual(12);

      // Verify the user can log in with the temporary password and transitions to 'active'
      const loginRes = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({
          email: inviteEmail,
          password: res.body.temporaryPassword,
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty("accessToken");
      expect(loginRes.body).toHaveProperty("refreshToken");
      expect(loginRes.body.user.email).toBe(inviteEmail);

      // Verify user entity in DB is now active
      const userRepo = dataSource.getRepository(User);
      const dbUser = await userRepo.findOne({ where: { id: res.body.id } });
      expect(dbUser?.status).toBe(UserStatus.ACTIVE);
      expect(dbUser?.lastLoginAt).not.toBeNull();
    });

    it("should allow platform_admin to invite a user with explicit agencyId", async () => {
      const inviteEmail = `platform-invited-${Date.now()}@beta.com`;
      const res = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          email: inviteEmail,
          role: UserRole.CAMPAIGN_MANAGER,
          agencyId: agencyB.id,
        })
        .expect(201);

      expect(res.body.email).toBe(inviteEmail);
      expect(res.body.role).toBe(UserRole.CAMPAIGN_MANAGER);
      expect(res.body.status).toBe(UserStatus.INVITED);
    });

    it("should reject platform_admin invite if agencyId is missing with 400 VALIDATION_ERROR", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .send({
          email: `missing-agency-${Date.now()}@ci.local`,
          role: UserRole.CAMPAIGN_MANAGER,
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("agencyId is required");
    });

    it("should reject agency_admin passing a foreign agencyId with 403 FORBIDDEN", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email: `cross-agency-${Date.now()}@beta.com`,
          role: UserRole.VIEWER,
          agencyId: agencyB.id,
        })
        .expect(403);

      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should reject inviting platform_admin role with 400 VALIDATION_ERROR", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email: `try-platform-${Date.now()}@alpha.com`,
          role: UserRole.PLATFORM_ADMIN,
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("platform_admin");
    });

    it("should reject duplicate email with 409 CONFLICT", async () => {
      const email = `dup-${Date.now()}@alpha.com`;
      await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email,
          role: UserRole.VIEWER,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email,
          role: UserRole.VIEWER,
        })
        .expect(409);

      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should reject non-admin roles with 403 FORBIDDEN", async () => {
      for (const token of [managerTokenAgencyA, reviewerTokenAgencyA, viewerTokenAgencyA]) {
        await request(app.getHttpServer())
          .post("/v1/users")
          .set("Authorization", `Bearer ${token}`)
          .send({
            email: `unauthorized-${Date.now()}@alpha.com`,
            role: UserRole.VIEWER,
          })
          .expect(403);
      }
    });

    it("should reject unauthenticated requests with 401 UNAUTHORIZED", async () => {
      await request(app.getHttpServer())
        .post("/v1/users")
        .send({
          email: "noauth@alpha.com",
          role: UserRole.VIEWER,
        })
        .expect(401);
    });
  });

  describe("GET /v1/users (List users)", () => {
    it("should list users for agency_admin scoped to their agency", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify no leaked password hashes or internals
      for (const u of res.body.data) {
        expect(u).toHaveProperty("id");
        expect(u).toHaveProperty("email");
        expect(u).toHaveProperty("role");
        expect(u).toHaveProperty("status");
        expect(u).not.toHaveProperty("passwordHash");
      }
    });

    it("should allow platform_admin to list all users unbounded", async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/users")
        .set("Authorization", `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should reject non-admin roles with 403 FORBIDDEN", async () => {
      await request(app.getHttpServer())
        .get("/v1/users")
        .set("Authorization", `Bearer ${managerTokenAgencyA}`)
        .expect(403);
    });
  });

  describe("PATCH /v1/users/:id/role (Change user role)", () => {
    let targetUser: User;

    beforeEach(async () => {
      const userRepo = dataSource.getRepository(User);
      targetUser = await userRepo.save(
        userRepo.create({
          email: `target-role-${Date.now()}@alpha.com`,
          agencyId: agencyA.id,
          role: UserRole.VIEWER,
          status: UserStatus.ACTIVE,
          passwordHash: "dummy-hash",
        }),
      );
    });

    it("should allow agency_admin to change a user's role", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/users/${targetUser.id}/role`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          role: UserRole.CAMPAIGN_MANAGER,
        })
        .expect(200);

      expect(res.body.id).toBe(targetUser.id);
      expect(res.body.role).toBe(UserRole.CAMPAIGN_MANAGER);
    });

    it("should reject changing role to platform_admin with 400 VALIDATION_ERROR", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/users/${targetUser.id}/role`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          role: UserRole.PLATFORM_ADMIN,
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("platform_admin");
    });

    it("should return 404 NOT_FOUND on cross-agency role update attempt", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/users/${targetUser.id}/role`)
        .set("Authorization", `Bearer ${adminTokenAgencyB}`)
        .send({
          role: UserRole.FRAUD_REVIEWER,
        })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /v1/users/:id/disable (Disable user)", () => {
    let targetUser: User;
    let tempPassword: string;

    beforeEach(async () => {
      const inviteRes = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email: `to-disable-${Date.now()}@alpha.com`,
          role: UserRole.VIEWER,
        })
        .expect(201);

      targetUser = inviteRes.body;
      tempPassword = inviteRes.body.temporaryPassword;
    });

    it("should disable user and reject subsequent login attempts", async () => {
      const disableRes = await request(app.getHttpServer())
        .patch(`/v1/users/${targetUser.id}/disable`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      expect(disableRes.body.id).toBe(targetUser.id);
      expect(disableRes.body.status).toBe(UserStatus.DISABLED);

      // Attempting to log in as the disabled user must fail with 401
      const loginRes = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({
          email: targetUser.email,
          password: tempPassword,
        })
        .expect(401);

      expect(loginRes.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should prevent admin from disabling their own account (self-disable guard)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/users/${adminA.id}/disable`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("Cannot disable your own user account.");
    });

    it("should return 404 NOT_FOUND on cross-agency disable attempt", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/users/${targetUser.id}/disable`)
        .set("Authorization", `Bearer ${adminTokenAgencyB}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Audit Trail Verification", () => {
    it("should record user.invited, user.role_changed, user.disabled in audit_logs", async () => {
      const auditRepo = dataSource.getRepository(AuditLog);

      const inviteEmail = `audit-test-${Date.now()}@alpha.com`;
      const createRes = await request(app.getHttpServer())
        .post("/v1/users")
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          email: inviteEmail,
          role: UserRole.VIEWER,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/v1/users/${createRes.body.id}/role`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .send({
          role: UserRole.CAMPAIGN_MANAGER,
        })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/v1/users/${createRes.body.id}/disable`)
        .set("Authorization", `Bearer ${adminTokenAgencyA}`)
        .expect(200);

      // Wait a moment for background audit interceptor tap execution
      await new Promise((resolve) => setTimeout(resolve, 300));

      const logs = await auditRepo.find({
        where: { resourceId: createRes.body.id },
        order: { createdAt: "ASC" },
      });

      const actions = logs.map((l) => l.action);
      expect(actions).toContain("user.invited");
      expect(actions).toContain("user.role_changed");
      expect(actions).toContain("user.disabled");
    });
  });
});
