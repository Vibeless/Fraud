import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Analysis, Creator, Submission } from "../../database/entities";

export interface CreatorContext {
  accountAgeSummary: string;
  followerCount: number;
  priorSubmissionsCount: number;
  priorSubmissionsAvgRiskScore: number | null;
}

/**
 * docs/specs/05_Backend_Folder_Structure_Specification.md §6 — Campaign
 * Intelligence Layer (CIL). MVP scope is read/write persistence of
 * creator history only, per the PRD's MVP boundaries — this does NOT do
 * cross-creator coordination/network detection. That's a post-MVP
 * extension of this module, not something to improvise into the
 * detection pipeline ahead of schedule.
 */
@Injectable()
export class CreatorHistoryService {
  constructor(
    @InjectRepository(Creator) private readonly creators: Repository<Creator>,
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    @InjectRepository(Analysis) private readonly analyses: Repository<Analysis>,
  ) {}

  /** Finds or creates the Creator row for an X account seen during collection. */
  async resolveCreator(params: {
    xUserId: string;
    xUsername: string;
    profileSnapshot: Record<string, unknown>;
  }): Promise<Creator> {
    const now = new Date();
    const existing = await this.creators.findOne({
      where: { xUserId: params.xUserId },
    });

    if (existing) {
      await this.creators.update(existing.id, {
        xUsername: params.xUsername,
        cachedProfile: params.profileSnapshot as any,
        lastSeenAt: now,
      });
      return { ...existing, xUsername: params.xUsername, lastSeenAt: now };
    }

    const created = this.creators.create({
      xUserId: params.xUserId,
      xUsername: params.xUsername,
      cachedProfile: params.profileSnapshot,
      firstSeenAt: now,
      lastSeenAt: now,
    });
    return this.creators.save(created);
  }

  /**
   * Prior Risk Scores for this creator, scoped to the requesting agency
   * only (a creator's history in another agency's campaigns is not this
   * agency's business — DUXS §4.3 shows this as historical context, not
   * a score, and it must stay agency-scoped like everything else).
   */
  async priorAnalyses(creatorId: string, agencyId: string, limit = 10) {
    const submissionIds = await this.submissions.find({
      where: { creatorId, agencyId },
      select: ["id"],
    });
    if (submissionIds.length === 0) return [];

    return this.analyses.find({
      where: submissionIds.map((s) => ({ submissionId: s.id })),
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Assembles the DUXS §4.3 Creator Context object for analysis responses.
   * Scoped strictly to the requesting agency's prior submissions.
   */
  async getCreatorContext(
    creatorId: string,
    agencyId: string,
    excludeSubmissionId?: string,
  ): Promise<CreatorContext | null> {
    const creator = await this.creators.findOne({ where: { id: creatorId } });
    if (!creator) return null;

    // 1. Account age summary
    const profile = (creator.cachedProfile ?? {}) as Record<string, unknown>;
    const rawCreatedAt = (profile.createdAt ?? profile.created_at) as
      | string
      | undefined;
    const accountCreatedAt = rawCreatedAt
      ? new Date(rawCreatedAt)
      : creator.firstSeenAt;
    const accountAgeSummary = formatAccountAge(accountCreatedAt);

    // 2. Follower count
    const publicMetrics = profile.publicMetrics as
      | Record<string, unknown>
      | undefined;
    const followerCount = Number(
      profile.followersCount ??
        profile.followers_count ??
        publicMetrics?.followersCount ??
        publicMetrics?.followers_count ??
        0,
    );

    // 3. Prior submissions & avg risk score for this agency
    const submissions = await this.submissions.find({
      where: { creatorId, agencyId },
      select: ["id"],
    });

    const priorSubmissions = excludeSubmissionId
      ? submissions.filter((s) => s.id !== excludeSubmissionId)
      : submissions;

    const priorSubmissionsCount = priorSubmissions.length;
    let priorSubmissionsAvgRiskScore: number | null = null;

    if (priorSubmissionsCount > 0) {
      const priorAnalyses = await this.analyses.find({
        where: {
          submissionId: In(priorSubmissions.map((s) => s.id)),
        },
      });

      const scoredAnalyses = priorAnalyses.filter(
        (a) => a.riskScore !== null && a.riskScore !== undefined,
      );

      if (scoredAnalyses.length > 0) {
        const total = scoredAnalyses.reduce(
          (sum, a) => sum + (a.riskScore ?? 0),
          0,
        );
        priorSubmissionsAvgRiskScore = Math.round(total / scoredAnalyses.length);
      }
    }

    return {
      accountAgeSummary,
      followerCount,
      priorSubmissionsCount,
      priorSubmissionsAvgRiskScore,
    };
  }
}

function formatAccountAge(createdAt: Date): string {
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffYears >= 1) {
    return `Account created ${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }
  if (diffMonths >= 1) {
    return `Account created ${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }
  if (diffDays >= 1) {
    return `Account created ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  return "Account created recently";
}
