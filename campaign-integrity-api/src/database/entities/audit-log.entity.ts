import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditActorType {
  USER = 'user',
  API_KEY = 'api_key',
  SYSTEM = 'system',
}

/**
 * DDS §4 — audit_logs: immutable log of security-relevant and operational
 * events (FR-010). Append-only — rows are never updated or deleted by
 * application code. See docs/specs/09_Logging_Monitoring_Strategy.md §8
 * for retention (kept indefinitely, distinct from operational log
 * retention).
 */
@Entity('audit_logs')
@Index(['agencyId', 'createdAt'])
@Index(['actorType', 'actorId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Null for platform-level events. */
  @Column({ type: 'uuid', nullable: true })
  agencyId!: string | null;

  @Column({ type: 'enum', enum: AuditActorType })
  actorType!: AuditActorType;

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  /** e.g. "submission.created", "analysis.completed", "api_key.revoked" */
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resourceType!: string | null;

  @Column({ type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'inet', nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
