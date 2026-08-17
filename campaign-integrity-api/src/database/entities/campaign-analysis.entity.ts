import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Campaign } from "./campaign.entity";

export enum CampaignAnalysisStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  STALE = "stale",
}

export enum CampaignAnalysisTrigger {
  MANUAL = "manual",
  CAMPAIGN_CLOSED = "campaign_closed",
}

/**
 * Aggregated analysis across a campaign's submissions.
 * Distinct from the per-submission `analyses` table (DDS §4).
 * Versioned sequentially per campaign. Append-only (never mutated/deleted on re-analysis or reopen).
 */
@Entity("campaign_analyses")
@Index(["campaignId", "version"], { unique: true })
export class CampaignAnalysis {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaignId" })
  campaign?: Campaign;

  @Column({ type: "integer" })
  version!: number;

  @Column({
    type: "enum",
    enum: CampaignAnalysisStatus,
    default: CampaignAnalysisStatus.PENDING,
  })
  status!: CampaignAnalysisStatus;

  @Column({
    type: "enum",
    enum: CampaignAnalysisTrigger,
  })
  trigger!: CampaignAnalysisTrigger;

  @Column({ type: "boolean", default: false })
  isStale!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;
}
