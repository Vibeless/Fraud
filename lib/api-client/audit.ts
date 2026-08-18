'use server';

import { cookies } from 'next/headers';
import { apiClient } from './client';

export type AuditActorType = 'user' | 'api_key' | 'system';

export interface AuditLogEntry {
  id: string;
  action: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorLabel?: string | null;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
}

export interface ListAuditLogsResponse {
  data: AuditLogEntry[];
  pagination: Pagination;
}

export interface ListAuditLogsParams {
  agencyId?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Resolves the bearer token from parameter or server cookie store.
 */
async function resolveToken(explicitToken?: string): Promise<string | undefined> {
  if (explicitToken) return explicitToken;
  try {
    const cookieStore = await cookies();
    return cookieStore.get('ci_access_token')?.value;
  } catch {
    return undefined;
  }
}

/**
 * Lists audit logs scoped to caller's agency per OAS §10 & AAD §5.2.
 * Accessible to platform_admin, agency_admin, and fraud_reviewer.
 */
export async function listAuditLogs(
  params: ListAuditLogsParams = {},
  explicitToken?: string
): Promise<ListAuditLogsResponse> {
  const token = await resolveToken(explicitToken);
  const query = new URLSearchParams();

  if (params.agencyId) query.set('agencyId', params.agencyId);
  if (params.action) query.set('action', params.action);
  if (params.actorId) query.set('actorId', params.actorId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));

  const queryString = query.toString();
  const endpoint = queryString ? `audit-logs?${queryString}` : 'audit-logs';

  return apiClient<ListAuditLogsResponse>(endpoint, {
    method: 'GET',
    token,
  });
}
