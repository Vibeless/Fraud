import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { ANALYSIS_QUEUE } from "../../queue/queue.constants";

@Module({
  imports: [BullModule.registerQueue({ name: ANALYSIS_QUEUE })],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
