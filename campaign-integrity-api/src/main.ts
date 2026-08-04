import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { AppConfigService } from "./config/app-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);
  const logger = new Logger("Bootstrap");

  app.use(helmet());
  app.enableCors({ origin: config.app.corsOrigins, credentials: true });

  // Global validation: every request body/query is validated against its
  // DTO; unknown fields are stripped rather than silently accepted. See
  // .agents/rules/20-security.md — "never trust unvalidated input."
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.app.port);
  logger.log(
    `Campaign Integrity API listening on :${config.app.port} (${config.app.env})`,
  );
}

bootstrap();
