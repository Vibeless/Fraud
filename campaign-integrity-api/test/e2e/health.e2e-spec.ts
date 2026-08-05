import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";

describe("GET /v1/health (Integration / E2E)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should return 200 OK with all dependencies ok when database and redis are running", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/health")
      .expect(200);

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("version");
    expect(response.body).toHaveProperty("dependencies");
    expect(response.body.dependencies).toEqual({
      database: "ok",
      redis: "ok",
      queue: "ok",
    });
  });
});
