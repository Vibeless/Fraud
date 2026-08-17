import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ANALYSIS_QUEUE } from "../queue.constants";
import { CampaignAnalysisTrigger } from "../../database/entities/campaign-analysis.entity";

export interface AnalysisJobData {
  submissionId?: string;
  campaignId?: string;
  campaignAnalysisId?: string;
  trigger?: CampaignAnalysisTrigger | "manual" | "campaign_closed";
}

/**
 * Enqueued by submissions.service on POST /v1/submissions (Backend
 * Folder Structure §7) or campaigns.service on campaign close / manual analyze.
 * The HTTP handler returns immediately after this call — analysis itself always runs
 * out-of-band in the worker tier, never on the request path (Deployment Architecture §3).
 */
@Injectable()
export class AnalysisProducer {
  constructor(
    @InjectQueue(ANALYSIS_QUEUE) private readonly queue: Queue<AnalysisJobData>,
  ) {}

  async enqueue(submissionId: string): Promise<void> {
    await this.queue.add(
      "analyze",
      { submissionId },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  }

  async enqueueCampaignAnalysis(
    campaignId: string,
    campaignAnalysisId: string,
    trigger: CampaignAnalysisTrigger | "manual" | "campaign_closed",
  ): Promise<void> {
    await this.queue.add(
      "analyze-campaign",
      { campaignId, campaignAnalysisId, trigger },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  }
}
