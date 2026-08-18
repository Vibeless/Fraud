import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import {
  ApiKey,
  AuditActorType,
  AuditLog,
  User,
} from "../../database/entities";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import {
  AuditLogResponseDto,
  ListAuditLogsResponseDto,
} from "./dto/audit-log-response.dto";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
  ) {}

  /**
   * GET /v1/audit-logs — OAS §10
   * Queries audit events for an agency with optional filters, pagination,
   * and batched resolution of actorId -> actorLabel without N+1 queries.
   */
  async list(
    agencyId: string,
    query: ListAuditLogsQueryDto,
  ): Promise<ListAuditLogsResponseDto> {
    const where: FindOptionsWhere<AuditLog> = { agencyId };

    if (query.action) {
      where.action = query.action;
    }

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.dateFrom && query.dateTo) {
      where.createdAt = Between(
        new Date(query.dateFrom),
        new Date(query.dateTo),
      );
    } else if (query.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(query.dateFrom));
    } else if (query.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(query.dateTo));
    }

    const [data, total] = await this.auditLogs.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    // Batched single query per actor type across current result page
    const userIds = [
      ...new Set(
        data
          .filter((e) => e.actorType === AuditActorType.USER && e.actorId)
          .map((e) => e.actorId as string),
      ),
    ];

    const apiKeyIds = [
      ...new Set(
        data
          .filter((e) => e.actorType === AuditActorType.API_KEY && e.actorId)
          .map((e) => e.actorId as string),
      ),
    ];

    const [users, apiKeys] = await Promise.all([
      userIds.length > 0
        ? this.users.find({
            where: { id: In(userIds) },
            select: ["id", "email"],
          })
        : Promise.resolve([]),
      apiKeyIds.length > 0
        ? this.apiKeys.find({
            where: { id: In(apiKeyIds) },
            select: ["id", "keyPrefix"],
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u.email]));
    const apiKeyMap = new Map(apiKeys.map((k) => [k.id, k.keyPrefix]));

    return {
      data: data.map((entry) =>
        this.toPublicAuditLog(entry, userMap, apiKeyMap),
      ),
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
      },
    };
  }

  private toPublicAuditLog(
    entry: AuditLog,
    userMap: Map<string, string>,
    apiKeyMap: Map<string, string>,
  ): AuditLogResponseDto {
    let actorLabel: string | null = null;

    if (entry.actorType === AuditActorType.SYSTEM) {
      actorLabel = "System";
    } else if (entry.actorType === AuditActorType.USER) {
      actorLabel = entry.actorId
        ? (userMap.get(entry.actorId) ?? null)
        : null;
    } else if (entry.actorType === AuditActorType.API_KEY) {
      actorLabel = entry.actorId
        ? (apiKeyMap.get(entry.actorId) ?? null)
        : null;
    }

    return {
      id: entry.id,
      action: entry.action,
      actorType: entry.actorType,
      actorId: entry.actorId,
      actorLabel,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt,
    };
  }
}
