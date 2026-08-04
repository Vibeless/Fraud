import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Analysis } from "./analysis.entity";

export enum FindingAnalyzer {
  POST = "post",
  ACCOUNT = "account",
  ENGAGEMENT = "engagement",
  AUDIENCE = "audience",
  BEHAVIOR = "behavior",
  COORDINATION = "coordination",
  BOT_NETWORK = "bot_network",
  HISTORICAL = "historical",
}

export enum FindingSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * DDS §4 — findings: one structured Finding produced by a detection rule
 * (Rule Library Specification §10). The Risk Aggregator and Evidence
 * Generator both read exclusively from this table — never from raw rule
 * output directly.
 *
 * `summary` is the only field ever shown to an agency. `details` is
 * internal-only (Detection Engine Spec §9) and must never be serialized
 * into an API response.
 */
@Entity("findings")
@Index(["analysisId", "severity"])
export class Finding {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  analysisId!: string;

  @ManyToOne(() => Analysis, { onDelete: "CASCADE" })
  @JoinColumn({ name: "analysisId" })
  analysis?: Analysis;

  /** e.g. "F-E001" */
  @Column({ type: "varchar", length: 50 })
  findingId!: string;

  /** e.g. "E001" — references the rule defined in code, not a DB row. */
  @Column({ type: "varchar", length: 20 })
  ruleId!: string;

  @Column({ type: "enum", enum: FindingAnalyzer })
  analyzer!: FindingAnalyzer;

  @Column({ type: "varchar", length: 50 })
  category!: string;

  @Column({ type: "enum", enum: FindingSeverity })
  severity!: FindingSeverity;

  /** 0.00–1.00 */
  @Column({ type: "decimal", precision: 3, scale: 2 })
  confidence!: number;

  /** Reviewer-facing evidence sentence — exposed via the API. */
  @Column({ type: "text" })
  summary!: string;

  /** INTERNAL ONLY — supporting measurements, never exposed via the API. */
  @Column({ type: "jsonb", nullable: true, select: false })
  details!: Record<string, unknown> | null;

  /** True for findings that inform scoring but are not surfaced as evidence. */
  @Column({ type: "boolean", default: false })
  isInternalOnly!: boolean;

  @Column({ type: "varchar", length: 20 })
  ruleVersion!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
