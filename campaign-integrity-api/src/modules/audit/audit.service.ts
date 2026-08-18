import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { AuditLog } from "../../database/entities";
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
  ) {}

  /**
   * GET /v1/audit-logs — OAS §10
   * Queries audit events for an agency with optional filters and pagination.
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

    return {
      data: data.map((entry) => this.toPublicAuditLog(entry)),
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
      },
    };
  }

  private toPublicAuditLog(entry: AuditLog): AuditLogResponseDto {
    return {
      id: entry.id,
      action: entry.action,
      actorType: entry.actorType,
      actorId: entry.actorId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt,
    };
  }
}
