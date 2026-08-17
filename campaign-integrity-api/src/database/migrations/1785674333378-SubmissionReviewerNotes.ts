import { MigrationInterface, QueryRunner } from "typeorm";

export class SubmissionReviewerNotes1785674333378
  implements MigrationInterface
{
  name = "SubmissionReviewerNotes1785674333378";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD "reviewerNote" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD "reviewedBy" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD "reviewedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_submissions_reviewedBy" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_submissions_reviewedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP COLUMN "reviewedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP COLUMN "reviewedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP COLUMN "reviewerNote"`,
    );
  }
}
