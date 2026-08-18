'use server';

import { cookies } from 'next/headers';
import { apiClient } from './client';

export type CampaignStatus = 'draft' | 'active' | 'closed';

export interface Campaign {
  id: string;
  name: string;
  externalCampaignId: string | null;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedCampaignsResponse {
  data: Campaign[];
  pagination: Pagination;
}

export interface CreateCampaignParams {
  name: string;
  externalCampaignId?: string | null;
  agencyId?: string;
}

export interface ListCampaignsParams {
  status?: CampaignStatus | string;
  agencyId?: string;
  page?: number;
  pageSize?: number;
}

export interface CampaignAnalysisResult {
  campaignId: string;
  analysisId: string;
  version: number;
  status: string;
  trigger: string;
  createdAt: string;
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
 * Creates a new campaign in status=draft per OAS §7 & AAD §5.2.
 */
export async function createCampaign(
  params: CreateCampaignParams,
  explicitToken?: string
): Promise<Campaign> {
  const token = await resolveToken(explicitToken);
  return apiClient<Campaign>('campaigns', {
    method: 'POST',
    body: JSON.stringify(params),
    token,
  });
}

/**
 * Lists campaigns scoped to caller's agency per OAS §7.
 */
export async function listCampaigns(
  params: ListCampaignsParams = {},
  explicitToken?: string
): Promise<PaginatedCampaignsResponse> {
  const token = await resolveToken(explicitToken);
  const query = new URLSearchParams();

  if (params.status) query.set('status', params.status);
  if (params.agencyId) query.set('agencyId', params.agencyId);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));

  const queryString = query.toString();
  const endpoint = queryString ? `campaigns?${queryString}` : 'campaigns';

  return apiClient<PaginatedCampaignsResponse>(endpoint, {
    method: 'GET',
    token,
  });
}

/**
 * Retrieves a single campaign by ID per OAS §7.
 */
export async function getCampaign(
  id: string,
  explicitToken?: string
): Promise<Campaign> {
  const token = await resolveToken(explicitToken);
  return apiClient<Campaign>(`campaigns/${encodeURIComponent(id)}`, {
    method: 'GET',
    token,
  });
}

/**
 * Activates a draft campaign (draft -> active) per OAS §7 lifecycle routes.
 */
export async function activateCampaign(
  id: string,
  explicitToken?: string
): Promise<Campaign> {
  const token = await resolveToken(explicitToken);
  return apiClient<Campaign>(`campaigns/${encodeURIComponent(id)}/activate`, {
    method: 'PATCH',
    token,
  });
}

/**
 * Closes an active campaign (active -> closed) per OAS §7 lifecycle routes.
 * Triggers final campaign analysis run and locks submissions.
 */
export async function closeCampaign(
  id: string,
  explicitToken?: string
): Promise<Campaign> {
  const token = await resolveToken(explicitToken);
  return apiClient<Campaign>(`campaigns/${encodeURIComponent(id)}/close`, {
    method: 'PATCH',
    token,
  });
}

/**
 * Reopens a closed campaign (closed -> active) per OAS §7 lifecycle routes.
 * Marks prior analyses stale and re-enables submissions.
 */
export async function reopenCampaign(
  id: string,
  explicitToken?: string
): Promise<Campaign> {
  const token = await resolveToken(explicitToken);
  return apiClient<Campaign>(`campaigns/${encodeURIComponent(id)}/reopen`, {
    method: 'PATCH',
    token,
  });
}

/**
 * Manually triggers an async campaign analysis for an active campaign per OAS §7.
 */
export async function analyzeCampaign(
  id: string,
  explicitToken?: string
): Promise<CampaignAnalysisResult> {
  const token = await resolveToken(explicitToken);
  return apiClient<CampaignAnalysisResult>(`campaigns/${encodeURIComponent(id)}/analyze`, {
    method: 'POST',
    token,
  });
}
