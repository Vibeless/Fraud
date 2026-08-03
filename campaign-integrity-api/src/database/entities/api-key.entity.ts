import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agency } from './agency.entity';

/**
 * DDS §4 — api_keys: machine credentials agencies use to call the REST
 * API. Only a hash is ever stored (AAD §3.1) — the plaintext secret is
 * returned once at creation and never again.
 */
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  agencyId!: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agencyId' })
  agency?: Agency;

  /** Argon2id hash of the full secret. Never select in a list query. */
  @Column({ type: 'varchar', length: 255, select: false })
  keyHash!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 16 })
  keyPrefix!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** e.g. ["submissions:write", "analyses:read"] — see AAD §3.2 */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  scopes!: string[];

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
