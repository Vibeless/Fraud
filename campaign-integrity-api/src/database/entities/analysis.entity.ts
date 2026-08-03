import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Submission } from './submission.entity';

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AnalysisStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * DDS §4 — analyses: one completed (or attempted) Detection Engine run.
 * A submission can have several over time (re-analysis) — each pinned to
 * the analysisVersion that produced it (Rule Library Specification §8).
 *
 * rawSignalSnapshot is internal-only per Detection Engine Spec §9 — it
 * must never be serialized into an API response. See
 * docs/specs/02_API_Specification_OAS.md and .agents/rules/20-security.md.
 */
@Entity('analyses')
@Index(['submissionId', 'createdAt'])
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  submissionId!: string;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission?: Submission;

  /** Engine + rule-set version that produced this result. */
  @Column({ type: 'varchar', length: 50 })
  analysisVersion!: string;

  @Column({ type: 'smallint', nullable: true })
  riskScore!: number | null;

  @Column({ type: 'enum', enum: RiskLevel, nullable: true })
  riskLevel!: RiskLevel | null;

  @Column({ type: 'enum', enum: AnalysisStatus })
  status!: AnalysisStatus;

  /**
   * INTERNAL ONLY — never returned by the API. Individual analyzer
   * scores, signal weights, and thresholds (Detection Engine Spec §9).
   */
  @Column({ type: 'jsonb', nullable: true, select: false })
  rawSignalSnapshot!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
