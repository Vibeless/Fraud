import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SubmissionsController } from "./submissions.controller";
import { AnalysesController } from "./analyses.controller";
import { SubmissionsService } from "./submissions.service";
import { Analysis, Finding, Submission } from "../../database/entities";
import { QueueModule } from "../../queue/queue.module";
import { DetectionModule } from "../detection/detection.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Analysis, Finding]),
    QueueModule,
    DetectionModule,
    CampaignsModule,
    IntelligenceModule,
  ],
  controllers: [SubmissionsController, AnalysesController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
