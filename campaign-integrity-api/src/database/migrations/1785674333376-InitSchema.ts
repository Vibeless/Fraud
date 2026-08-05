import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1785674333376 implements MigrationInterface {
  name = "InitSchema1785674333376";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."agencies_status_enum" AS ENUM('active', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(100) NOT NULL, "contactEmail" character varying(255) NOT NULL, "status" "public"."agencies_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_77c10291e442a33f0060b9cad0" ON "agencies" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('platform_admin', 'agency_admin', 'campaign_manager', 'fraud_reviewer', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'invited', 'disabled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agencyId" uuid, "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'invited', "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_184debc49e72b43579476cc6e7" ON "users" ("agencyId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agencyId" uuid NOT NULL, "keyHash" character varying(255) NOT NULL, "keyPrefix" character varying(16) NOT NULL, "name" character varying(100) NOT NULL, "scopes" jsonb NOT NULL DEFAULT '[]', "lastUsedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfa5e4a8263f32e4029b32ce72" ON "api_keys" ("agencyId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3ee8ea3e49f8f437c17219dad6" ON "api_keys" ("keyPrefix") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."campaigns_status_enum" AS ENUM('active', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agencyId" uuid NOT NULL, "externalCampaignId" character varying(255), "name" character varying(255) NOT NULL, "status" "public"."campaigns_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_831e3fcd4fc45b4e4c3f57a9ee4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3f1423d4cc6140a203efa00098" ON "campaigns" ("agencyId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "creators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "xUserId" character varying(64) NOT NULL, "xUsername" character varying(100) NOT NULL, "firstSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL, "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL, "cachedProfile" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b27dd693f7df17bbfc21f00166a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_237fe3e11bc380c564321d3293" ON "creators" ("xUserId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."submissions_status_enum" AS ENUM('pending', 'validating', 'queued', 'analyzing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agencyId" uuid NOT NULL, "campaignId" uuid, "creatorId" uuid, "submittedBy" uuid, "xPostUrl" text NOT NULL, "xPostId" character varying(64) NOT NULL, "status" "public"."submissions_status_enum" NOT NULL DEFAULT 'pending', "idempotencyKey" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_10b3be95b8b2fb1e482e07d706b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_221f8aea86769733d205ca3bbe" ON "submissions" ("agencyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6979f6b259c3ff19b8d1eb5201" ON "submissions" ("xPostId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef99f70367ae769aba6d75134f" ON "submissions" ("agencyId", "status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d9b3b17ee57e4917c458d38ff1" ON "submissions" ("agencyId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "x_data_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "submissionId" uuid NOT NULL, "postData" jsonb NOT NULL, "creatorData" jsonb NOT NULL, "engagementSample" jsonb, "collectedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_67820ceae37424fab825ca9abe3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_008adf2f323244593f87e71ee5" ON "x_data_snapshots" ("submissionId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."analyses_risklevel_enum" AS ENUM('low', 'moderate', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."analyses_status_enum" AS ENUM('completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "analyses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "submissionId" uuid NOT NULL, "analysisVersion" character varying(50) NOT NULL, "riskScore" smallint, "riskLevel" "public"."analyses_risklevel_enum", "status" "public"."analyses_status_enum" NOT NULL, "rawSignalSnapshot" jsonb, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "completedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_91421900ca225ed9865d016a940" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_80910b91f3734c82717550cae8" ON "analyses" ("submissionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22fa84e120e74de9922084307e" ON "analyses" ("submissionId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."findings_analyzer_enum" AS ENUM('post', 'account', 'engagement', 'audience', 'behavior', 'coordination', 'bot_network', 'historical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."findings_severity_enum" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TABLE "findings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "analysisId" uuid NOT NULL, "findingId" character varying(50) NOT NULL, "ruleId" character varying(20) NOT NULL, "analyzer" "public"."findings_analyzer_enum" NOT NULL, "category" character varying(50) NOT NULL, "severity" "public"."findings_severity_enum" NOT NULL, "confidence" numeric(3,2) NOT NULL, "summary" text NOT NULL, "details" jsonb, "isInternalOnly" boolean NOT NULL DEFAULT false, "ruleVersion" character varying(20) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ae9807d6293c23c13ff8804d09c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0cd49ffbef3649f21c76391fe" ON "findings" ("analysisId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9f45d2bfbcbb1abff9afe587eb" ON "findings" ("analysisId", "severity") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_actortype_enum" AS ENUM('user', 'api_key', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agencyId" uuid, "actorType" "public"."audit_logs_actortype_enum" NOT NULL, "actorId" uuid, "action" character varying(100) NOT NULL, "resourceType" character varying(50), "resourceId" uuid, "metadata" jsonb, "ipAddress" inet, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35282cb71f64178fc7852c368b" ON "audit_logs" ("actorType", "actorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3cace45e73fd09c3555c71d87e" ON "audit_logs" ("agencyId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_184debc49e72b43579476cc6e75" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_dfa5e4a8263f32e4029b32ce725" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD CONSTRAINT "FK_3f1423d4cc6140a203efa000983" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_221f8aea86769733d205ca3bbe9" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_2a7a81239abf162849fd6b342a9" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_4818a7b0fe2ad3164c74596fc55" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_b84520954ba674c6760348c09b3" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "x_data_snapshots" ADD CONSTRAINT "FK_008adf2f323244593f87e71ee52" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "analyses" ADD CONSTRAINT "FK_80910b91f3734c82717550cae8b" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "findings" ADD CONSTRAINT "FK_a0cd49ffbef3649f21c76391fe2" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "findings" DROP CONSTRAINT "FK_a0cd49ffbef3649f21c76391fe2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "analyses" DROP CONSTRAINT "FK_80910b91f3734c82717550cae8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "x_data_snapshots" DROP CONSTRAINT "FK_008adf2f323244593f87e71ee52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_b84520954ba674c6760348c09b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_4818a7b0fe2ad3164c74596fc55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_2a7a81239abf162849fd6b342a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_221f8aea86769733d205ca3bbe9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" DROP CONSTRAINT "FK_3f1423d4cc6140a203efa000983"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_dfa5e4a8263f32e4029b32ce725"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_184debc49e72b43579476cc6e75"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3cace45e73fd09c3555c71d87e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35282cb71f64178fc7852c368b"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_actortype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f45d2bfbcbb1abff9afe587eb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a0cd49ffbef3649f21c76391fe"`,
    );
    await queryRunner.query(`DROP TABLE "findings"`);
    await queryRunner.query(`DROP TYPE "public"."findings_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."findings_analyzer_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22fa84e120e74de9922084307e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80910b91f3734c82717550cae8"`,
    );
    await queryRunner.query(`DROP TABLE "analyses"`);
    await queryRunner.query(`DROP TYPE "public"."analyses_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."analyses_risklevel_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_008adf2f323244593f87e71ee5"`,
    );
    await queryRunner.query(`DROP TABLE "x_data_snapshots"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef99f70367ae769aba6d75134f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9b3b17ee57e4917c458d38ff1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6979f6b259c3ff19b8d1eb5201"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_221f8aea86769733d205ca3bbe"`,
    );
    await queryRunner.query(`DROP TABLE "submissions"`);
    await queryRunner.query(`DROP TYPE "public"."submissions_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_237fe3e11bc380c564321d3293"`,
    );
    await queryRunner.query(`DROP TABLE "creators"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3f1423d4cc6140a203efa00098"`,
    );
    await queryRunner.query(`DROP TABLE "campaigns"`);
    await queryRunner.query(`DROP TYPE "public"."campaigns_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ee8ea3e49f8f437c17219dad6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dfa5e4a8263f32e4029b32ce72"`,
    );
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_184debc49e72b43579476cc6e7"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_77c10291e442a33f0060b9cad0"`,
    );
    await queryRunner.query(`DROP TABLE "agencies"`);
    await queryRunner.query(`DROP TYPE "public"."agencies_status_enum"`);
  }
}
