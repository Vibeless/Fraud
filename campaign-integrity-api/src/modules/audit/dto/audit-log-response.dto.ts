import { AuditActorType } from "../../../database/entities";

/**
 * OAS §10: Audit log entry response shape.
 */
export interface AuditLogResponseDto {
  id: string;
  action: string;
  actorType: AuditActorType;
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ListAuditLogsResponseDto {
  data: AuditLogResponseDto[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}
