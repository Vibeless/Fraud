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

export enum CampaignStatus {
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
    default: CampaignStatus.ACTIVE,
  })
  status!: CampaignStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
