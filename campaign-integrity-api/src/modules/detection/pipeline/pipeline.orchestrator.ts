import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Analysis,
  AnalysisStatus,
  Finding as FindingEntity,
  FindingAnalyzer,
  FindingSeverity,
  Submission,
  SubmissionStatus,
} from "../../../database/entities";
import { CollectorService } from "./collector.service";
import { ValidatorService } from "./validator.service";
import { RuleEngineService } from "../rule-engine.service";
import { RiskAggregatorService } from "../aggregator/risk-aggregator.service";
import { CreatorHistoryService } from "../../intelligence/creator-history.service";

const ANALYSIS_VERSION = "engine-0.1.0+rules-2026.08.0";

/**
 * Drives one submission through the full Detection Engine Spec pipeline:
 * collect -> validate -> analyze (rules) -> aggregate -> persist.
 * Called by the BullMQ processor (queue/processors/analysis.processor.ts)
 * — never called synchronously from an HTTP request handler, per
 * docs/specs/08_Deployment_Architecture.md §3 (analysis work never runs
 * on the request path).
 *
 * Evidence generation itself happens on read (see submissions.service's
 * getAnalysis), not here — this orchestrator's job ends at persisting
 * Findings; it does not shape the public response.
 */
@Injectable()
export class PipelineOrchestrator {
  private readonly logger = new Logger("PipelineOrchestrator");

  constructor(
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    @InjectRepository(Analysis) private readonly analyses: Repository<Analysis>,
    @InjectRepository(FindingEntity)
    private readonly findings: Repository<FindingEntity>,
    private readonly collector: CollectorService,
    private readonly validator: ValidatorService,
    private readonly ruleEngine: RuleEngineService,
    private readonly riskAggregator: RiskAggregatorService,
    private readonly creatorHistory: CreatorHistoryService,
  ) {}

  async run(submissionId: string): Promise<void> {
    const submission = await this.submissions.findOneOrFail({
      where: { id: submissionId },
    });
    const startedAt = new Date();

    try {
      await this.submissions.update(submission.id, {
        status: SubmissionStatus.ANALYZING,
      });

      const snapshot = await this.collector.collect(
        submission.id,
        submission.xPostId,
      );

      const validation = this.validator.validate(snapshot);
      if (!validation.valid) {
        await this.markFailed(
          submission.id,
          startedAt,
          validation.reason ?? "Validation failed.",
        );
        return;
      }

      const creator = await this.creatorHistory.resolveCreator({
        xUserId: snapshot.account.xUserId,
        xUsername: snapshot.account.xUsername,
        profileSnapshot: snapshot.account as unknown as Record<string, unknown>,
      });
      await this.submissions.update(submission.id, { creatorId: creator.id });

      const runFindings = this.ruleEngine.runAll(snapshot);
      const { riskScore, riskLevel } =
        this.riskAggregator.aggregate(runFindings);

      const analysis = await this.analyses.save(
        this.analyses.create({
          submissionId: submission.id,
          analysisVersion: ANALYSIS_VERSION,
          riskScore,
          riskLevel,
          status: AnalysisStatus.COMPLETED,
          rawSignalSnapshot: { findingCount: runFindings.length },
          startedAt,
          completedAt: new Date(),
        }),
      );

      if (runFindings.length > 0) {
        await this.findings.save(
          runFindings.map((f) =>
            this.findings.create({
              analysisId: analysis.id,
              findingId: f.findingId,
              ruleId: f.ruleId,
              ruleVersion: f.ruleVersion,
              // f.analyzer/f.severity are plain string unions in the
              // framework-free finding.types.ts shape (rules never import
              // TypeORM). This is the one place that domain shape gets
              // translated into the persistence entity's enum types — the
              // string values are identical to the enum values by
              // construction (see finding.types.ts), so this cast is safe.
              analyzer: f.analyzer as FindingAnalyzer,
              category: f.category,
              severity: f.severity as FindingSeverity,
              confidence: f.confidence,
              summary: f.summary,
              details: f.details,
              isInternalOnly: f.isInternalOnly,
            }),
          ),
        );
      }

      await this.submissions.update(submission.id, {
        status: SubmissionStatus.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Pipeline failed for submission ${submission.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      await this.markFailed(
        submission.id,
        startedAt,
        (error as Error).message ?? "Unknown pipeline error.",
      );
    }
  }

  private async markFailed(
    submissionId: string,
    startedAt: Date,
    reason: string,
  ): Promise<void> {
    await this.submissions.update(submissionId, {
      status: SubmissionStatus.FAILED,
    });
    await this.analyses.save(
      this.analyses.create({
        submissionId,
        analysisVersion: ANALYSIS_VERSION,
        riskScore: null,
        riskLevel: null,
        status: AnalysisStatus.FAILED,
        rawSignalSnapshot: { failureReason: reason },
        startedAt,
        completedAt: new Date(),
      }),
    );
  }
}
