import { Finding } from "../finding.types";

/**
 * The shape of the raw data a rule evaluates. Deliberately a plain
 * interface, not an entity — rules never touch TypeORM or the database
 * directly, only this snapshot shape (sourced from x_data_snapshots at
 * evaluation time). Fields here are illustrative; extend as real X API
 * fields are wired in via the x-integration module — see
 * docs/specs/ (X API Capability Analysis, not yet converted to markdown
 * in this repo) for what X actually exposes.
 */
export interface DetectionSnapshot {
  post: {
    id: string;
    createdAt: string;
    text: string;
    publicMetrics: {
      likeCount: number;
      retweetCount: number;
      replyCount: number;
    };
  };
  account: {
    xUserId: string;
    xUsername: string;
    createdAt: string;
    followersCount: number;
    followingCount: number;
    verified: boolean;
  };
  engagementSample?: {
    likingUsers: Array<{ xUserId: string; accountCreatedAt: string }>;
  };
}

/**
 * Every rule file implements this. Rule files are plain TypeScript — no
 * NestJS decorators, no framework imports (Backend Folder Structure §10)
 * — so they run in milliseconds under plain Jest and can, per the Rule
 * Library Specification, be extracted into a standalone package later.
 */
export interface DetectionRule {
  readonly ruleId: string; // e.g. "E001"
  readonly ruleVersion: string;
  readonly analyzer: Finding["analyzer"];
  readonly category: string;

  /** Returns a Finding if the rule fires, or null if it doesn't. */
  evaluate(snapshot: DetectionSnapshot): Finding | null;
}
