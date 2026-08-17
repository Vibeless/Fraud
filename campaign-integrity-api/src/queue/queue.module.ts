import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AppConfigModule } from "../config/config.module";
import { AppConfigService } from "../config/app-config.service";
import { AnalysisProcessor } from "./processors/analysis.processor";
import { AnalysisProducer } from "./producers/analysis.producer";
import { DetectionModule } from "../modules/detection/detection.module";
import { ANALYSIS_QUEUE } from "./queue.constants";

export { ANALYSIS_QUEUE };

@Module({
  imports: [
    AppConfigModule,
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const redisConfig = config.redis;
        const base = redisConfig.url
          ? { url: redisConfig.url }
          : {
              host: redisConfig.host,
              port: redisConfig.port,
              password: redisConfig.password,
            };
        return {
          connection: {
            ...base,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: ANALYSIS_QUEUE }),
    DetectionModule,
  ],
  providers: [AnalysisProcessor, AnalysisProducer],
  exports: [AnalysisProducer],
})
export class QueueModule {}
