import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Agency } from "./agency.entity";
import { Campaign } from "./campaign.entity";
import { Creator } from "./creator.entity";
import { User } from "./user.entity";

export enum SubmissionStatus {
  PENDING = "pending",
  VALIDATING = "validating",
  QUEUED = "queued",
  ANALYZING = "analyzing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/** DDS §4 — submissions: one X post submitted for analysis (FR-001). */
@Entity("submissions")
@Index(["agencyId", "status", "createdAt"])
@Index("IDX_submissions_agency_id_idempotency_key", ["agencyId", "idempotencyKey"], {
  unique: true,
  where: `"idempotencyKey" IS NOT NULL`,
})
export class Submission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  agencyId!: string;

  @ManyToOne(() => Agency, { onDelete: "CASCADE" })
  @JoinColumn({ name: "agencyId" })
  agency?: Agency;

  @Column({ type: "uuid", nullable: true })
  campaignId!: string | null;

  @ManyToOne(() => Campaign, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "campaignId" })
  campaign?: Campaign;

  @Column({ type: "uuid", nullable: true })
  creatorId!: string | null;

  @ManyToOne(() => Creator, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "creatorId" })
  creator?: Creator;

  @Column({ type: "uuid", nullable: true })
  submittedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "submittedBy" })
  submittedByUser?: User;

  @Column({ type: "text" })
  xPostUrl!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  xPostId!: string;

  @Column({
    type: "enum",
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status!: SubmissionStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
