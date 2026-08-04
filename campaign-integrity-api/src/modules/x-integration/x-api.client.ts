import { Injectable, Logger } from "@nestjs/common";
import { DetectionSnapshot } from "../detection/rules/rule.interface";

/**
 * THIS IS A MOCK. Real X API integration is explicitly separate Phase 4
 * work (per the project roadmap) — this client returns synthetic data so
 * the rest of the pipeline (collector -> validator -> analyzers ->
 * aggregator -> evidence) can be built and tested end-to-end without a
 * live X API dependency.
 *
 * When wiring the real client: fetch actual X API field names/shapes are
 * catalogued in the X API Capability Analysis doc (Tier 1/2/3 breakdown)
 * — not yet converted to markdown in docs/specs/, ask for it rather than
 * guessing field availability or rate limits. Auth, caching (Redis), and
 * rate-limit handling per docs/specs/08_Deployment_Architecture.md §5
 * and docs/specs/09_Logging_Monitoring_Strategy.md §3 all belong in this
 * module, not scattered into the collector.
 */
@Injectable()
export class XApiClient {
  private readonly logger = new Logger("XApiClient (MOCK)");

  async fetchPostSnapshot(postId: string): Promise<DetectionSnapshot> {
    this.logger.warn(
      `Returning MOCK data for post ${postId} — real X API integration is not yet wired in.`,
    );

    const now = new Date();
    const accountCreatedAt = new Date(
      now.getTime() - 400 * 24 * 60 * 60 * 1000,
    );

    return {
      post: {
        id: postId,
        createdAt: now.toISOString(),
        text: "[mock post text]",
        publicMetrics: { likeCount: 120, retweetCount: 14, replyCount: 6 },
      },
      account: {
        xUserId: "mock-user-id",
        xUsername: "mock_creator",
        createdAt: accountCreatedAt.toISOString(),
        followersCount: 3400,
        followingCount: 512,
        verified: false,
      },
      engagementSample: {
        likingUsers: Array.from({ length: 20 }, (_, i) => ({
          xUserId: `mock-liker-${i}`,
          accountCreatedAt: new Date(
            now.getTime() - (i % 2 === 0 ? 5 : 500) * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })),
      },
    };
  }
}
