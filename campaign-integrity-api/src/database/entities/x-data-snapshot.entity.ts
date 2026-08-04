import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Submission } from "./submission.entity";

/**
 * DDS §4 — x_data_snapshots: raw public data retrieved from X for a
 * submission (Detection Engine Spec, Stage 1 — Data Collection).
 * Persisted separately from the Redis cache so an analysis is auditable
 * and reproducible after the fact, independent of cache TTLs.
 */
@Entity("x_data_snapshots")
export class XDataSnapshot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  submissionId!: string;

  @ManyToOne(() => Submission, { onDelete: "CASCADE" })
  @JoinColumn({ name: "submissionId" })
  submission?: Submission;

  @Column({ type: "jsonb" })
  postData!: Record<string, unknown>;

  @Column({ type: "jsonb" })
  creatorData!: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true })
  engagementSample!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  collectedAt!: Date;
}
