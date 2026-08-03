import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ANALYSIS_QUEUE } from '../queue.constants';

export interface AnalysisJobData {
  submissionId: string;
}

/**
 * Enqueued by submissions.service on POST /v1/submissions (Backend
 * Folder Structure §7). The HTTP handler returns 201 immediately after
 * this call — analysis itself always runs out-of-band in the worker
 * tier, never on the request path (Deployment Architecture §3).
 */
@Injectable()
export class AnalysisProducer {
  constructor(@InjectQueue(ANALYSIS_QUEUE) private readonly queue: Queue<AnalysisJobData>) {}

  async enqueue(submissionId: string): Promise<void> {
    await this.queue.add(
      'analyze',
      { submissionId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }
}
