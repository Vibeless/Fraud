import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignStatusAndCampaignAnalyses1785674333377
  implements MigrationInterface
{
  name = "CampaignStatusAndCampaignAnalyses1785674333377";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Expand campaigns_status_enum to include 'draft' safely across PostgreSQL transactions
    await queryRunner.query(
      `ALTER TYPE "public"."campaigns_status_enum" RENAME TO "campaigns_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."campaigns_status_enum" AS ENUM('draft', 'active', 'closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ALTER COLUMN "status" TYPE "public"."campaigns_status_enum" USING "status"::text::"public"."campaigns_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."campaigns_status_enum_old"`,
    );

    // 2. Create enums for campaign_analyses table
    await queryRunner.query(
      `CREATE TYPE "public"."campaign_analyses_status_enum" AS ENUM('pending', 'completed', 'failed', 'stale')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."campaign_analyses_trigger_enum" AS ENUM('manual', 'campaign_closed')`,
    );

    // 3. Create campaign_analyses table
    await queryRunner.query(
      `CREATE TABLE "campaign_analyses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "campaignId" uuid NOT NULL,
        "version" integer NOT NULL,
        "status" "public"."campaign_analyses_status_enum" NOT NULL DEFAULT 'pending',
        "trigger" "public"."campaign_analyses_trigger_enum" NOT NULL,
        "isStale" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_campaign_analyses_id" PRIMARY KEY ("id")
      )`,
    );

    // 4. Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_analyses_campaignId" ON "campaign_analyses" ("campaignId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_campaign_analyses_campaignId_version" ON "campaign_analyses" ("campaignId", "version")`,
    );

    // 5. Add foreign key constraint to campaigns
    await queryRunner.query(
      `ALTER TABLE "campaign_analyses" ADD CONSTRAINT "FK_campaign_analyses_campaignId" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "campaign_analyses" DROP CONSTRAINT "FK_campaign_analyses_campaignId"`,
    );

    // 2. Drop indexes
    await queryRunner.query(
      `DROP INDEX "public"."IDX_campaign_analyses_campaignId_version"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_campaign_analyses_campaignId"`,
    );

    // 3. Drop table
    await queryRunner.query(`DROP TABLE "campaign_analyses"`);

    // 4. Drop enums
    await queryRunner.query(
      `DROP TYPE "public"."campaign_analyses_trigger_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."campaign_analyses_status_enum"`,
    );

    // 5. Revert campaigns status enum
    await queryRunner.query(
      `CREATE TYPE "public"."campaigns_status_enum_revert" AS ENUM('active', 'closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ALTER COLUMN "status" TYPE "public"."campaigns_status_enum_revert" USING (
        CASE WHEN "status"::text = 'draft' THEN 'active' ELSE "status"::text END
      )::"public"."campaigns_status_enum_revert"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."campaigns_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."campaigns_status_enum_revert" RENAME TO "campaigns_status_enum"`,
    );
  }
}
