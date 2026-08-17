import "reflect-metadata";
import * as argon2 from "argon2";
import * as dotenv from "dotenv";
import dataSource from "../data-source";
import { Agency, AgencyStatus, User, UserRole, UserStatus } from "../entities";

// Load environment variables before environment or database host checks
dotenv.config();

/**
 * Ensures the dev seed script cannot be executed against production or staging environments
 * or remote database hosts, per Backend Folder Structure §8.
 */
export function assertLocalDevEnvironment(): void {
  const env = process.env.NODE_ENV;
  if (env === "production" || env === "staging") {
    throw new Error(
      `Refusing to execute dev seed script in "${env}" environment per Backend Folder Structure §8.`,
    );
  }

  const dbHost = process.env.DB_HOST;
  const dbUrl = process.env.DATABASE_URL;

  let resolvedHost = dbHost;
  if (!resolvedHost && dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      resolvedHost = parsed.hostname;
    } catch {
      // Ignore invalid URL parse errors here; host validation below will handle missing/invalid host
    }
  }

  const allowedHosts = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "postgres",
    "db",
    "host.docker.internal",
  ]);

  const normalizedHost = resolvedHost?.toLowerCase().trim();
  const isLocalHost =
    normalizedHost &&
    (allowedHosts.has(normalizedHost) || normalizedHost.endsWith(".local"));

  if (!isLocalHost) {
    throw new Error(
      `Refusing to execute dev seed script against non-local database host: "${resolvedHost ?? "undefined"}". Dev seed data must only be run against local/dev targets per Backend Folder Structure §8.`,
    );
  }
}

const DEV_SEED_PASSWORD = "DevTest123!";

interface UserSeedDefinition {
  email: string;
  role: UserRole;
  agencyId: string | null;
}

export async function seedDevData(): Promise<void> {
  assertLocalDevEnvironment();

  console.log("Connecting to database for dev seeding...");
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const agencyRepo = dataSource.getRepository(Agency);
  const userRepo = dataSource.getRepository(User);

  // 1. Seed Agency
  const agencySlug = "dev-test-agency";
  let agency = await agencyRepo.findOne({ where: { slug: agencySlug } });

  if (!agency) {
    agency = agencyRepo.create({
      name: "Dev Test Agency",
      slug: agencySlug,
      contactEmail: "dev@campaignintegrity.local",
      status: AgencyStatus.ACTIVE,
    });
    agency = await agencyRepo.save(agency);
    console.log(`Created agency: ${agency.name} (id: ${agency.id})`);
  } else {
    console.log(`Agency already exists: ${agency.name} (id: ${agency.id})`);
  }

  // 2. Seed Users (one per RBAC role from AAD §5.1)
  const userDefs: UserSeedDefinition[] = [
    {
      email: "platform_admin@campaignintegrity.local",
      role: UserRole.PLATFORM_ADMIN,
      agencyId: null,
    },
    {
      email: "admin@dev-test-agency.local",
      role: UserRole.AGENCY_ADMIN,
      agencyId: agency.id,
    },
    {
      email: "manager@dev-test-agency.local",
      role: UserRole.CAMPAIGN_MANAGER,
      agencyId: agency.id,
    },
    {
      email: "reviewer@dev-test-agency.local",
      role: UserRole.FRAUD_REVIEWER,
      agencyId: agency.id,
    },
    {
      email: "viewer@dev-test-agency.local",
      role: UserRole.VIEWER,
      agencyId: agency.id,
    },
  ];

  const summaryResults: Array<{ Email: string; Role: string; Status: string }> =
    [];

  for (const userDef of userDefs) {
    const existingUser = await userRepo.findOne({
      where: { email: userDef.email },
    });

    if (!existingUser) {
      // Hash password independently per user row using exact Argon2id algorithm
      const passwordHash = await argon2.hash(DEV_SEED_PASSWORD, {
        type: argon2.argon2id,
      });

      const user = userRepo.create({
        email: userDef.email,
        role: userDef.role,
        agencyId: userDef.agencyId,
        passwordHash,
        status: UserStatus.ACTIVE,
        lastLoginAt: null,
      });

      await userRepo.save(user);
      summaryResults.push({
        Email: user.email,
        Role: user.role,
        Status: "Created",
      });
    } else {
      summaryResults.push({
        Email: existingUser.email,
        Role: existingUser.role,
        Status: "Existing (Skipped)",
      });
    }
  }

  console.log("\nDev Seed Completion Summary:");
  console.table(summaryResults);
}

// Execute script directly if called from CLI / npm script
if (require.main === module) {
  seedDevData()
    .then(async () => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Dev seeding failed:", err);
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      process.exit(1);
    });
}
