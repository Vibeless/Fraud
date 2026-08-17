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

    return this.toPublicCampaign(campaign);
  }

  /**
   * GET /v1/campaigns — OAS §7
   * Lists campaigns scoped to caller's agency.
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

    return {
      data: data.map((c) => this.toPublicCampaign(c)),
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
  async findById(agencyId: string, id: string) {
    const campaign = await this.findScoped({ id, agencyId });
    return this.toPublicCampaign(campaign);
  }

  /**
   * PATCH /v1/campaigns/:id/activate
   * draft -> active only. 409 Conflict if not in draft.
   */
  async activate(agencyId: string, id: string) {
    const campaign = await this.findScoped({ id, agencyId });

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Campaign cannot be activated from status '${campaign.status}'. Only 'draft' campaigns can be activated.`,
      });
    }

    campaign.status = CampaignStatus.ACTIVE;
    const updated = await this.campaigns.save(campaign);
    return this.toPublicCampaign(updated);
  }

  /**
   * PATCH /v1/campaigns/:id/close
   * active -> closed only. 409 Conflict if not in active.
   * On success: auto-triggers final async analysis run, locks submissions,
   * produces new versioned CampaignAnalysis with trigger: campaign_closed.
   */
  async close(agencyId: string, id: string) {
    const campaign = await this.findScoped({ id, agencyId });

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

    return this.toPublicCampaign(updated);
  }

  /**
   * PATCH /v1/campaigns/:id/reopen
   * closed -> active only. 409 Conflict if not in closed.
   * On success: marks prior analyses stale (does NOT delete them per DDS §7 append-only principle),
   * allows new submissions again.
   */
  async reopen(agencyId: string, id: string) {
    const campaign = await this.findScoped({ id, agencyId });

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

    return this.toPublicCampaign(updated);
  }

  /**
   * POST /v1/campaigns/:id/analyze — manual "Analyze now" escape hatch
   * Only valid when campaign status=active (400 if draft or closed).
   * Does NOT change campaign status.
   * Produces a new versioned CampaignAnalysis row with trigger: manual.
   */
  async analyze(agencyId: string, id: string) {
    const campaign = await this.findScoped({ id, agencyId });

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

  private toPublicCampaign(c: Campaign) {
    return {
      id: c.id,
      name: c.name,
      externalCampaignId: c.externalCampaignId,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
