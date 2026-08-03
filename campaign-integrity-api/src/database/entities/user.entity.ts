import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agency } from './agency.entity';

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  AGENCY_ADMIN = 'agency_admin',
  CAMPAIGN_MANAGER = 'campaign_manager',
  FRAUD_REVIEWER = 'fraud_reviewer',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  DISABLED = 'disabled',
}

/**
 * DDS §4 — users: internal dashboard users belonging to an agency (or
 * platform staff, where agencyId is null). Role semantics are defined in
 * docs/specs/04_Authentication_Authorization_Design_AAD.md §5.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agencyId!: string | null;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agencyId' })
  agency?: Agency;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /** Argon2id hash. Never select this column in a general-purpose query. */
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INVITED })
  status!: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
