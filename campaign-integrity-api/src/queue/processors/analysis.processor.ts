import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ANALYSIS_QUEUE } from '../queue.constants';
import { AnalysisJobData } from '../producers/analysis.producer';
import { PipelineOrchestrator } from '../../modules/detection/pipeline/pipeline.orchestrator';

/**
 * Consumes "analyze-submission" jobs and invokes the pipeline
 * orchestrator (Backend Folder Structure §7). This class is the only
 * place that should ever call PipelineOrchestrator.run() — HTTP
 * controllers enqueue via AnalysisProducer, they never call the
 * orchestrator directly.
 */
@Processor(ANALYSIS_QUEUE)
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger('AnalysisProcessor');

  constructor(private readonly orchestrator: PipelineOrchestrator) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    this.logger.log(`Processing analysis job ${job.id} for submission ${job.data.submissionId}`);
    await this.orchestrator.run(job.data.submissionId);
  }
}
