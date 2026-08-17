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

/**
 * DELIBERATE DEVIATION FROM DDS §4:
 * The DDS §4 specification documents `ENUM(active, closed)` for campaign status.
 * This module introduces a three-state lifecycle: DRAFT -> ACTIVE -> CLOSED,
 * keeping draft state separate from submission-level AnalysisStatus.
 * Default status on creation is DRAFT.
 * NOTE: Corresponding documentation update in DDS §4 is required on docs side.
 */
export enum CampaignStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  CLOSED = "closed",
}

/** DDS §4 — campaigns: optional grouping for submissions. */
@Entity("campaigns")
export class Campaign {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  agencyId!: string;

  @ManyToOne(() => Agency, { onDelete: "CASCADE" })
  @JoinColumn({ name: "agencyId" })
  agency?: Agency;

  @Column({ type: "varchar", length: 255, nullable: true })
  externalCampaignId!: string | null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({
    type: "enum",
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status!: CampaignStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
