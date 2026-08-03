import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Analysis, Creator, Submission } from '../../database/entities';

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
    @InjectRepository(Submission) private readonly submissions: Repository<Submission>,
    @InjectRepository(Analysis) private readonly analyses: Repository<Analysis>,
  ) {}

  /** Finds or creates the Creator row for an X account seen during collection. */
  async resolveCreator(params: {
    xUserId: string;
    xUsername: string;
    profileSnapshot: Record<string, unknown>;
  }): Promise<Creator> {
    const now = new Date();
    const existing = await this.creators.findOne({ where: { xUserId: params.xUserId } });

    if (existing) {
      await this.creators.update(existing.id, {
        xUsername: params.xUsername,
        // Same QueryDeepPartialEntity + jsonb limitation as auth.service.ts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      select: ['id'],
    });
    if (submissionIds.length === 0) return [];

    return this.analyses.find({
      where: submissionIds.map((s) => ({ submissionId: s.id })),
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
