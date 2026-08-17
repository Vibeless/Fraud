import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ANALYSIS_QUEUE } from "../queue.constants";
import { AnalysisJobData } from "../producers/analysis.producer";
import { PipelineOrchestrator } from "../../modules/detection/pipeline/pipeline.orchestrator";

/**
 * Consumes "analyze" and "analyze-campaign" jobs (Backend Folder Structure §7).
 * HTTP controllers enqueue via AnalysisProducer, they never call the
 * orchestrator directly.
 */
@Processor(ANALYSIS_QUEUE)
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger("AnalysisProcessor");

  constructor(private readonly orchestrator: PipelineOrchestrator) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    if (job.data.submissionId) {
      this.logger.log(
        `Processing analysis job ${job.id} for submission ${job.data.submissionId}`,
      );
      await this.orchestrator.run(job.data.submissionId);
    } else if (job.data.campaignId) {
      this.logger.log(
        `Processing campaign analysis job ${job.id} for campaign ${job.data.campaignId} (analysis ${job.data.campaignAnalysisId}, trigger ${job.data.trigger})`,
      );
      // Campaign aggregation worker logic can process aggregated findings across submissions
    }
  }

  @OnWorkerEvent("error")
  onError(error: Error): void {
    // Prevent unhandled error event crashes during socket teardown or network drops
    this.logger.warn(`Worker error: ${error.message}`);
  }
}
