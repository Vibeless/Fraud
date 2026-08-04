import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * DDS §4 — creators: an X account that has submitted content. Backs the
 * Campaign Intelligence Layer (CIL) — see Backend Folder Structure §6.
 * MVP scope is read/write persistence only; coordination/network detection
 * across creators is a post-MVP extension of this entity's usage.
 */
@Entity("creators")
export class Creator {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  xUserId!: string;

  /** Denormalized for lookups — X usernames can change, xUserId cannot. */
  @Column({ type: "varchar", length: 100 })
  xUsername!: string;

  @Column({ type: "timestamptz" })
  firstSeenAt!: Date;

  @Column({ type: "timestamptz" })
  lastSeenAt!: Date;

  /** Last known profile snapshot (followers, account age, etc). */
  @Column({ type: "jsonb", nullable: true })
  cachedProfile!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
