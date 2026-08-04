import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CreatorHistoryService } from "./creator-history.service";
import { Analysis, Creator, Submission } from "../../database/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Creator, Submission, Analysis])],
  providers: [CreatorHistoryService],
  exports: [CreatorHistoryService],
})
export class IntelligenceModule {}
