import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign, CampaignAnalysis } from "../../database/entities";
import { QueueModule } from "../../queue/queue.module";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignAnalysis]),
    QueueModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
