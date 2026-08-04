import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppConfigModule } from "../config/config.module";
import { AppConfigService } from "../config/app-config.service";
import { ENTITIES } from "./entities";

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: "postgres" as const,
        ...config.database,
        entities: ENTITIES,
        // Migrations are the only sanctioned way to change schema — see
        // docs/specs/07_CICD_Strategy.md §6. synchronize is hard-disabled,
        // including in development, so local dev never silently drifts
        // from what migrations actually produce.
        synchronize: false,
        migrationsRun: false,
        logging:
          config.app.env === "development" ? ["error", "warn"] : ["error"],
      }),
    }),
  ],
})
export class DatabaseModule {}
