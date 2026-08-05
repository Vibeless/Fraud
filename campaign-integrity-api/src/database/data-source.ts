import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

// Load env directly here since this file is run by the TypeORM CLI outside NestJS.
dotenv.config();

/**
 * Standalone export default DataSource for TypeORM CLI.
 *
 * This file is the one deliberate, documented exception to the
 * "no direct process.env access" rule (per .agents/rules/20-security.md)
 * because the TypeORM CLI runs outside the NestJS DI/application context.
 *
 * It resolves connection settings in the exact same shape as AppConfigService.database:
 * - If DATABASE_URL is set, uses the single connection URL.
 * - Otherwise, falls back to discrete host, port, username, password, and database.
 */
const dbUrl = process.env.DATABASE_URL;

const connectionOptions = dbUrl
  ? { url: dbUrl }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME,
    };

export default new DataSource({
  type: "postgres",
  ...connectionOptions,
  entities: [__dirname + "/entities/**/*.entity.{ts,js}"],
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
});
