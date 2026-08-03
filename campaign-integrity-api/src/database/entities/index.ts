export * from './agency.entity';
export * from './user.entity';
export * from './api-key.entity';
export * from './campaign.entity';
export * from './creator.entity';
export * from './submission.entity';
export * from './x-data-snapshot.entity';
export * from './analysis.entity';
export * from './finding.entity';
export * from './audit-log.entity';

import { Agency } from './agency.entity';
import { User } from './user.entity';
import { ApiKey } from './api-key.entity';
import { Campaign } from './campaign.entity';
import { Creator } from './creator.entity';
import { Submission } from './submission.entity';
import { XDataSnapshot } from './x-data-snapshot.entity';
import { Analysis } from './analysis.entity';
import { Finding } from './finding.entity';
import { AuditLog } from './audit-log.entity';

/**
 * Explicit entity class list for TypeORM's `entities:` option. Deliberately
 * NOT `Object.values(entities)` on this barrel — that would also sweep up
 * every enum exported alongside each entity (AgencyStatus, UserRole, etc),
 * which are plain objects TypeORM chokes on. Add new entities here AND to
 * the `export *` list above.
 */
export const ENTITIES = [
  Agency,
  User,
  ApiKey,
  Campaign,
  Creator,
  Submission,
  XDataSnapshot,
  Analysis,
  Finding,
  AuditLog,
];
