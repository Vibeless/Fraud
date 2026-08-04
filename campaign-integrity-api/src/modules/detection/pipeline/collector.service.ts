import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { XDataSnapshot } from "../../../database/entities";
import { XApiClient } from "../../x-integration/x-api.client";
import { DetectionSnapshot } from "../rules/rule.interface";

/**
 * Detection Engine Spec, Stage 1 — Data Collection. Calls x-integration,
 * persists what came back into x_data_snapshots (DDS §4) so the analysis
 * is reproducible later independent of any cache TTL, then hands the
 * same data forward in-memory for this run.
 */
@Injectable()
export class CollectorService {
  constructor(
    @InjectRepository(XDataSnapshot)
    private readonly snapshots: Repository<XDataSnapshot>,
    private readonly xApiClient: XApiClient,
  ) {}

  async collect(
    submissionId: string,
    xPostId: string,
  ): Promise<DetectionSnapshot> {
    const snapshot = await this.xApiClient.fetchPostSnapshot(xPostId);

    await this.snapshots.save(
      this.snapshots.create({
        submissionId,
        postData: snapshot.post,
        creatorData: snapshot.account,
        engagementSample: snapshot.engagementSample ?? null,
      }),
    );

    return snapshot;
  }
}
