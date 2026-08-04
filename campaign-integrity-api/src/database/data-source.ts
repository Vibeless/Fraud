import "reflect-metadata";
import { DataSource } from "typeorm";
import { ENTITIES } from "./entities";

/**
 * Used by the TypeORM CLI (`npm run migration:generate` / `migration:run`)
 * and, indirectly, by TypeOrmModule at app bootstrap. Reads DATABASE_URL
 * directly (rather than through AppConfigService) because the CLI runs
 * outside the Nest DI container — this is the one sanctioned exception to
 * "never read process.env directly" (see .agents/rules/20-security.md).
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: ENTITIES,
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
});
