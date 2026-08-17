import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import {
  Analysis,
  AnalysisStatus,
  Finding as FindingEntity,
  RiskLevel,
  Submission,
  SubmissionStatus,
} from "../../database/entities";
import { AnalysisProducer } from "../../queue/producers/analysis.producer";
import { EvidenceGeneratorService } from "../detection/evidence/evidence-generator.service";
import { Finding } from "../detection/finding.types";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { ListSubmissionsQueryDto } from "./dto/list-submissions-query.dto";
import { parseXPostId } from "./x-post-url.util";
import { ErrorCode } from "../../common/filters/api-error";
import { CampaignsService } from "../campaigns/campaigns.service";

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    @InjectRepository(Analysis) private readonly analyses: Repository<Analysis>,
    @InjectRepository(FindingEntity)
    private readonly findings: Repository<FindingEntity>,
    private readonly analysisProducer: AnalysisProducer,
    private readonly evidenceGenerator: EvidenceGeneratorService,
    private readonly campaignsService: CampaignsService,
  ) {}

  /** POST /v1/submissions — OAS §5. Returns 201 immediately; analysis runs async. */
  async create(
    agencyId: string,
    submittedBy: string | null,
    dto: CreateSubmissionDto,
  ) {
    const xPostId = parseXPostId(dto.postUrl);

    if (dto.externalSubmissionId) {
      const existing = await this.submissions.findOne({
        where: { agencyId, idempotencyKey: dto.externalSubmissionId },
      });
      if (existing) {
        throw new ConflictException({
          code: ErrorCode.DUPLICATE_SUBMISSION,
          message: "externalSubmissionId already used by this agency.",
        });
      }
    }

    if (dto.campaignId) {
      await this.campaignsService.ensureCampaignAcceptsSubmissions(
        agencyId,
        dto.campaignId,
      );
    }

    const submission = await this.submissions.save(
      this.submissions.create({
        agencyId,
        campaignId: dto.campaignId ?? null,
        submittedBy,
        xPostUrl: dto.postUrl,
        xPostId,
        status: SubmissionStatus.QUEUED,
        idempotencyKey: dto.externalSubmissionId ?? null,
      }),
    );

    await this.analysisProducer.enqueue(submission.id);

    return this.toPublicSubmission(submission);
  }

  /** GET /v1/submissions/{id} — OAS §5. */
  async findById(agencyId: string, id: string) {
    const submission = await this.findScoped({ id, agencyId });
    const latest = await this.analyses.findOne({
      where: { submissionId: submission.id },
      order: { createdAt: "DESC" },
    });

    return {
      ...this.toPublicSubmission(submission),
      latestAnalysisId: latest?.id ?? null,
    };
  }

  /** GET /v1/submissions — OAS §6. */
  async list(agencyId: string, query: ListSubmissionsQueryDto) {
    const where: FindOptionsWhere<Submission> = { agencyId };
    if (query.status) where.status = query.status;
    if (query.campaignId) where.campaignId = query.campaignId;

    const [data, total] = await this.submissions.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    // riskLevel filters on the latest analysis, not the submission row
    // itself; for an MVP starter this filters in-memory after the page is
    // fetched. Revisit with a join or a denormalized column if this
    // becomes a hot path at scale.
    let filtered = data;
    if (query.riskLevel) {
      const withAnalysis = await Promise.all(
        data.map(async (s) => ({
          submission: s,
          analysis: await this.analyses.findOne({
            where: { submissionId: s.id },
            order: { createdAt: "DESC" },
          }),
        })),
      );
      filtered = withAnalysis
        .filter((x) => x.analysis?.riskLevel === query.riskLevel)
        .map((x) => x.submission);
    }

    return {
      data: filtered.map((s) => this.toPublicSubmission(s)),
      pagination: { total, page: query.page, pageSize: query.pageSize },
    };
  }

  /** GET /v1/submissions/{id}/analysis — OAS §5, the primary result endpoint. */
  async getLatestAnalysis(agencyId: string, submissionId: string) {
    const submission = await this.findScoped({ id: submissionId, agencyId });
    const latest = await this.analyses.findOne({
      where: { submissionId: submission.id },
      order: { createdAt: "DESC" },
    });

    if (!latest) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "No completed analysis yet for this submission.",
      });
    }

    return this.toPublicAnalysis(latest);
  }

  /** GET /v1/analyses/{id} — OAS §5, retrieves a specific (possibly historical) analysis. */
  async getAnalysisById(agencyId: string, analysisId: string) {
    const analysis = await this.analyses.findOne({ where: { id: analysisId } });
    if (!analysis) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "No analysis with that id.",
      });
    }
    // agency-scope via the parent submission — an analysis has no agencyId of its own
    await this.findScoped({ id: analysis.submissionId, agencyId });

    return this.toPublicAnalysis(analysis);
  }

  private async findScoped(
    where: FindOptionsWhere<Submission>,
  ): Promise<Submission> {
    const submission = await this.submissions.findOne({ where });
    if (!submission) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: "No submission with that id for this agency.",
      });
    }
    return submission;
  }

  private toPublicSubmission(s: Submission) {
    return {
      id: s.id,
      status: s.status,
      postUrl: s.xPostUrl,
      campaignId: s.campaignId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private async toPublicAnalysis(analysis: Analysis) {
    if (analysis.status === AnalysisStatus.FAILED) {
      throw new UnprocessableEntityException({
        code: ErrorCode.ANALYSIS_FAILED,
        message: "Analysis attempted but could not complete.",
      });
    }

    const findingRows = await this.findings.find({
      where: { analysisId: analysis.id },
    });
    const findings: Finding[] = findingRows.map((f) => ({
      findingId: f.findingId,
      ruleId: f.ruleId,
      ruleVersion: f.ruleVersion,
      analyzer: f.analyzer,
      category: f.category,
      severity: f.severity,
      confidence: Number(f.confidence),
      summary: f.summary,
      details: {}, // internal-only column is select:false and never loaded here
      isInternalOnly: f.isInternalOnly,
    }));

    return {
      analysisId: analysis.id,
      submissionId: analysis.submissionId,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel as RiskLevel,
      evidence: this.evidenceGenerator.generate(findings),
      analysisVersion: analysis.analysisVersion,
      analyzedAt: analysis.completedAt,
    };
  }
}
