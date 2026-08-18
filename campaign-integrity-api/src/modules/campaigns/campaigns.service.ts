import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import {
  Campaign,
  CampaignAnalysis,
  CampaignAnalysisStatus,
  CampaignAnalysisTrigger,
  CampaignStatus,
} from "../../database/entities";
import { AnalysisProducer } from "../../queue/producers/analysis.producer";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { ListCampaignsQueryDto } from "./dto/list-campaigns-query.dto";
import { ErrorCode } from "../../common/filters/api-error";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaigns: Repository<Campaign>,
    @InjectRepository(CampaignAnalysis)
    private readonly campaignAnalyses: Repository<CampaignAnalysis>,
    private readonly analysisProducer: AnalysisProducer,
  ) {}

  /**
   * POST /v1/campaigns — OAS §7
   * Starts in status=draft (3-state lifecycle: draft -> active -> closed).
   */
  async create(agencyId: string, dto: CreateCampaignDto) {
    const campaign = await this.campaigns.save(
      this.campaigns.create({
        agencyId,
        name: dto.name,
        externalCampaignId: dto.externalCampaignId ?? null,
        status: CampaignStatus.DRAFT,
      }),
    );

    return this.toPublicCampaign(campaign, {
      submissionCount: 0,
      averageRiskScore: null,
    });
  }

  /**
   * GET /v1/campaigns — OAS §7
   * Lists campaigns scoped to caller's agency, attaching batch-computed aggregate fields.
   */
  async list(agencyId: string, query: ListCampaignsQueryDto) {
    const where: FindOptionsWhere<Campaign> = { agencyId };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.campaigns.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    const aggregatesMap = await this.getAggregatesForCampaigns(
      data.map((c) => c.id),
    );

    return {
      data: data.map((c) => this.toPublicCampaign(c, aggregatesMap.get(c.id))),
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
      },
    };
  }

  /**
   * GET /v1/campaigns/:id — OAS §7
   */
  async findById(agencyId: string | null, id: string) {
    const campaign = await this.findScoped(
      agencyId !== null ? { id, agencyId } : { id },
    );
    const aggregatesMap = await this.getAggregatesForCampaigns([campaign.id]);
    return this.toPublicCampaign(campaign, aggregatesMap.get(campaign.id));
  }

  /**
   * PATCH /v1/campaigns/:id/activate
   * draft -> active only. 409 Conflict if not in draft.
   */
  async activate(agencyId: string | null, id: string) {
    const campaign = await this.findScoped(
      agencyId !== null ? { id, agencyId } : { id },
    );

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Campaign cannot be activated from status '${campaign.status}'. Only 'draft' campaigns can be activated.`,
      });
    }

    campaign.status = CampaignStatus.ACTIVE;
    const updated = await this.campaigns.save(campaign);
    const aggregatesMap = await this.getAggregatesForCampaigns([updated.id]);
    return this.toPublicCampaign(updated, aggregatesMap.get(updated.id));
  }

  /**
   * PATCH /v1/campaigns/:id/close
   * active -> closed only. 409 Conflict if not in active.
   * On success: auto-triggers final async analysis run, locks submissions,
   * produces new versioned CampaignAnalysis with trigger: campaign_closed.
   */
  async close(agencyId: string | null, id: string) {
    const campaign = await this.findScoped(
      agencyId !== null ? { id, agencyId } : { id },
    );

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Campaign cannot be closed from status '${campaign.status}'. Only 'active' campaigns can be closed.`,
      });
    }

    campaign.status = CampaignStatus.CLOSED;
    const updated = await this.campaigns.save(campaign);

    // Increment version per campaign
    const latest = await this.campaignAnalyses.findOne({
      where: { campaignId: campaign.id },
      order: { version: "DESC" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const analysis = await this.campaignAnalyses.save(
      this.campaignAnalyses.create({
        campaignId: campaign.id,
        version: nextVersion,
        status: CampaignAnalysisStatus.PENDING,
        trigger: CampaignAnalysisTrigger.CAMPAIGN_CLOSED,
        isStale: false,
      }),
    );

    await this.analysisProducer.enqueueCampaignAnalysis(
      campaign.id,
      analysis.id,
      CampaignAnalysisTrigger.CAMPAIGN_CLOSED,
    );

    const aggregatesMap = await this.getAggregatesForCampaigns([updated.id]);
    return this.toPublicCampaign(updated, aggregatesMap.get(updated.id));
  }

  /**
   * PATCH /v1/campaigns/:id/reopen
   * closed -> active only. 409 Conflict if not in closed.
   * On success: marks prior analyses stale (does NOT delete them per DDS §7 append-only principle),
   * allows new submissions again.
   */
  async reopen(agencyId: string | null, id: string) {
    const campaign = await this.findScoped(
      agencyId !== null ? { id, agencyId } : { id },
    );

    if (campaign.status !== CampaignStatus.CLOSED) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Campaign cannot be reopened from status '${campaign.status}'. Only 'closed' campaigns can be reopened.`,
      });
    }

    campaign.status = CampaignStatus.ACTIVE;
    const updated = await this.campaigns.save(campaign);

    // Invalidate current analysis (mark stale, never delete)
    await this.campaignAnalyses.update(
      { campaignId: campaign.id, isStale: false },
      { isStale: true, status: CampaignAnalysisStatus.STALE },
    );

    const aggregatesMap = await this.getAggregatesForCampaigns([updated.id]);
    return this.toPublicCampaign(updated, aggregatesMap.get(updated.id));
  }

  /**
   * POST /v1/campaigns/:id/analyze — manual "Analyze now" escape hatch
   * Only valid when campaign status=active (400 if draft or closed).
   * Does NOT change campaign status.
   * Produces a new versioned CampaignAnalysis row with trigger: manual.
   */
  async analyze(agencyId: string | null, id: string) {
    const campaign = await this.findScoped(
      agencyId !== null ? { id, agencyId } : { id },
    );

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot trigger manual analysis for campaign in status '${campaign.status}'. Campaign must be 'active'.`,
      });
    }

    const latest = await this.campaignAnalyses.findOne({
      where: { campaignId: campaign.id },
      order: { version: "DESC" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const analysis = await this.campaignAnalyses.save(
      this.campaignAnalyses.create({
        campaignId: campaign.id,
        version: nextVersion,
        status: CampaignAnalysisStatus.PENDING,
        trigger: CampaignAnalysisTrigger.MANUAL,
        isStale: false,
      }),
    );

    await this.analysisProducer.enqueueCampaignAnalysis(
      campaign.id,
      analysis.id,
      CampaignAnalysisTrigger.MANUAL,
    );

    return {
      campaignId: campaign.id,
      analysisId: analysis.id,
      version: analysis.version,
      status: analysis.status,
      trigger: analysis.trigger,
      createdAt: analysis.createdAt,
    };
  }

  /**
   * Helper called by SubmissionsService to ensure submissions can only be added to active campaigns.
   */
  async ensureCampaignAcceptsSubmissions(
    agencyId: string,
    campaignId: string,
  ): Promise<Campaign> {
    const campaign = await this.findScoped({ id: campaignId, agencyId });

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Submissions cannot be accepted for campaign '${campaign.name}' because its status is '${campaign.status}'. Only 'active' campaigns accept submissions.`,
      });
    }

    return campaign;
  }

  /**
   * Batches aggregate calculation (submissionCount, averageRiskScore) across campaign IDs.
   * Efficient single SQL query with non-N+1 scaling.
   * - submissionCount: total volume of submissions where campaignId matches (all statuses).
   * - averageRiskScore: average of riskScore from each submission's LATEST completed analysis only.
   *   Submissions with no completed analysis are excluded from the average.
   *   If 0 completed submissions exist, averageRiskScore is null.
   */
  private async getAggregatesForCampaigns(
    campaignIds: string[],
  ): Promise<
    Map<string, { submissionCount: number; averageRiskScore: number | null }>
  > {
    const map = new Map<
      string,
      { submissionCount: number; averageRiskScore: number | null }
    >();

    if (!campaignIds || campaignIds.length === 0) {
      return map;
    }

    if (!this.campaigns.manager?.query) {
      return map;
    }

    const results: Array<{
      campaignId: string;
      submissionCount: string | number;
      averageRiskScore: string | number | null;
    }> = await this.campaigns.manager.query(
      `
      WITH campaign_submissions AS (
        SELECT id, "campaignId"
        FROM submissions
        WHERE "campaignId" = ANY($1)
      ),
      latest_analyses AS (
        SELECT DISTINCT ON (a."submissionId")
          a."submissionId",
          a."riskScore" AS risk_score
        FROM analyses a
        INNER JOIN campaign_submissions cs ON cs.id = a."submissionId"
        WHERE a.status = 'completed' AND a."riskScore" IS NOT NULL
        ORDER BY a."submissionId", a."createdAt" DESC
      )
      SELECT
        cs."campaignId" AS "campaignId",
        COUNT(cs.id)::int AS "submissionCount",
        AVG(la.risk_score)::float AS "averageRiskScore"
      FROM campaign_submissions cs
      LEFT JOIN latest_analyses la ON la."submissionId" = cs.id
      GROUP BY cs."campaignId"
      `,
      [campaignIds],
    );

    for (const row of results) {
      const submissionCount = Number(row.submissionCount) || 0;
      const averageRiskScore =
        row.averageRiskScore !== null && row.averageRiskScore !== undefined
          ? Math.round(Number(row.averageRiskScore))
          : null;

      map.set(row.campaignId, {
        submissionCount,
        averageRiskScore,
      });
    }

    return map;
  }

  private async findScoped(
    where: FindOptionsWhere<Campaign>,
  ): Promise<Campaign> {
    const campaign = await this.campaigns.findOne({ where });
    if (!campaign) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "No campaign with that id for this agency.",
      });
    }
    return campaign;
  }

  private toPublicCampaign(
    c: Campaign,
    aggregates?: { submissionCount: number; averageRiskScore: number | null },
  ) {
    return {
      id: c.id,
      name: c.name,
      externalCampaignId: c.externalCampaignId,
      status: c.status,
      submissionCount: aggregates?.submissionCount ?? 0,
      averageRiskScore: aggregates?.averageRiskScore ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
